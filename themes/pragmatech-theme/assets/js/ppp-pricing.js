// Purchase Power Parity pricing for course landing pages (layout: course-landing).
// Calls the Netlify Edge Function at /api/ppp once per session and renders the
// pricing cards from its answer: prices, checkout links (promocode), the early bird
// badge, a note and a banner. While the request runs, a spinner covers the prices.
// The banner shows top right once the visitor scrolls.
// Early bird: the pricing root carries the campaign (percentage, deadline, coupon).
// Before the endpoint answers, the script renders the early bird price while the
// deadline has not passed and the list price afterwards, so a page built before the
// deadline needs no new deploy. A valid endpoint answer always wins; when the endpoint
// fails, this local pricing stays. Nothing from the response is injected as HTML -
// only textContent and URL parameters.
(function () {
  var pricingRoot = document.querySelector('[data-ppp-root]');
  if (!pricingRoot) return;

  var CACHE_KEY = 'ppp:v2';
  var BANNER_DISMISSED_KEY = 'ppp:bannerDismissed';
  var REQUEST_TIMEOUT_MS = 3000;
  var COUPON_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
  var COUNTRY_PATTERN = /^[A-Z]{2}$/;
  var BANNER_SCROLL_THRESHOLD_PX = 80;

  var pageParams = new URLSearchParams(window.location.search);
  var testCountry = pageParams.get('country');
  var testNow = pageParams.get('now');
  var testToken = pageParams.get('token');
  var isTestMode = Boolean(testCountry || testNow);
  var currentTime = testNow && !isNaN(Date.parse(testNow)) ? Date.parse(testNow) : Date.now();

  var bannerElement = document.querySelector('[data-ppp-banner]');
  var bannerCloseButton = document.querySelector('[data-ppp-banner-close]');
  var isBannerEligible = false;
  if (bannerElement && bannerCloseButton) {
    bannerCloseButton.addEventListener('click', function () {
      writeStorage(BANNER_DISMISSED_KEY, '1');
      updateBannerVisibility();
    });
  }
  if (bannerElement) {
    window.addEventListener('scroll', updateBannerVisibility, { passive: true });
  }

  renderPricing(localPricing());

  var cachedData = isTestMode ? null : readCachedData();
  if (cachedData) {
    renderPricing(cachedData);
    return;
  }

  var apiParams = new URLSearchParams();
  if (testCountry) apiParams.set('country', testCountry);
  if (testNow) apiParams.set('now', testNow);
  if (testToken) apiParams.set('token', testToken);
  var apiUrl = '/api/ppp' + (apiParams.toString() ? '?' + apiParams.toString() : '');

  // The spinner covers the prices until the endpoint answers, fails or times out.
  setLoading(true);

  var abortController = new AbortController();
  var timeoutTimer = setTimeout(function () {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  fetch(apiUrl, {
    signal: abortController.signal,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' }
  })
    .then(function (response) {
      if (!response.ok) throw new Error('PPP endpoint returned ' + response.status);
      return response.json();
    })
    .then(function (rawData) {
      var pricingData = normalizeData(rawData);
      if (!pricingData) return;
      if (!isTestMode) writeStorage(CACHE_KEY, JSON.stringify(pricingData));
      if (window._paq) {
        var eventName = 'tier-' + pricingData.tier + (pricingData.earlyBird ? '-early-bird' : '');
        window._paq.push(['trackEvent', 'PPP', eventName, pricingData.country || 'unknown']);
      }
      renderPricing(pricingData);
    })
    .catch(function () {
      // Timeout, network error, non-2xx or invalid JSON: keep the local pricing.
    })
    .finally(function () {
      clearTimeout(timeoutTimer);
      setLoading(false);
    });

  function setLoading(isLoading) {
    if (isLoading) {
      pricingRoot.setAttribute('data-ppp-loading', '');
      pricingRoot.setAttribute('aria-busy', 'true');
    } else {
      pricingRoot.removeAttribute('data-ppp-loading');
      pricingRoot.removeAttribute('aria-busy');
    }
  }

  function updateBannerVisibility() {
    if (!bannerElement) return;
    var hasScrolled = window.scrollY > BANNER_SCROLL_THRESHOLD_PX;
    var isDismissed = readStorage(BANNER_DISMISSED_KEY) === '1';
    bannerElement.classList.toggle('hidden', !(isBannerEligible && hasScrolled && !isDismissed));
  }

  function noDiscount(country) {
    return {
      country: country || '',
      countryName: '',
      tier: 1,
      discountPercentage: 0,
      couponCode: null,
      earlyBird: false,
      earlyBirdEndsAt: null
    };
  }

  // Early bird pricing from the pre-rendered campaign attributes, list price otherwise.
  function localPricing() {
    var earlyBirdPricing = {
      country: '',
      countryName: '',
      tier: 1,
      discountPercentage: Number(pricingRoot.getAttribute('data-ppp-early-bird-percentage')),
      couponCode: pricingRoot.getAttribute('data-ppp-early-bird-coupon'),
      earlyBird: true,
      earlyBirdEndsAt: pricingRoot.getAttribute('data-ppp-early-bird-ends-at')
    };
    return isValidDiscount(earlyBirdPricing) && !isExpired(earlyBirdPricing) ? earlyBirdPricing : noDiscount();
  }

  // Validates the endpoint response. A valid "no discount" answer resets to the list
  // price; anything unexpected or an expired early bird returns null and keeps the
  // local pricing.
  function normalizeData(rawData) {
    if (!rawData || typeof rawData !== 'object') return null;

    var country = typeof rawData.country === 'string' && COUNTRY_PATTERN.test(rawData.country) ? rawData.country : '';
    var tier = rawData.tier;
    if (!Number.isInteger(tier) || tier < 1 || tier > 4) return null;

    if (rawData.discountPercentage === 0 && rawData.couponCode === null) return noDiscount(country);

    var pricingData = {
      country: country,
      countryName: typeof rawData.countryName === 'string' ? rawData.countryName : '',
      tier: tier,
      discountPercentage: rawData.discountPercentage,
      couponCode: rawData.couponCode,
      earlyBird: rawData.earlyBird === true,
      earlyBirdEndsAt: rawData.earlyBird === true ? rawData.earlyBirdEndsAt : null
    };
    if (!isValidDiscount(pricingData) || isExpired(pricingData)) return null;
    return pricingData;
  }

  function isValidDiscount(pricingData) {
    var discountPercentage = pricingData.discountPercentage;
    var isValidPercentage = typeof discountPercentage === 'number' && discountPercentage > 0 && discountPercentage <= 100;
    var isValidCoupon = typeof pricingData.couponCode === 'string' && COUPON_PATTERN.test(pricingData.couponCode);
    // Tier 1 visitors only get a discount during the early bird campaign.
    var isValidCampaign = pricingData.earlyBird
      ? typeof pricingData.earlyBirdEndsAt === 'string' && !isNaN(Date.parse(pricingData.earlyBirdEndsAt))
      : pricingData.tier > 1;
    return isValidPercentage && isValidCoupon && isValidCampaign;
  }

  function isExpired(pricingData) {
    return pricingData.earlyBird && currentTime >= Date.parse(pricingData.earlyBirdEndsAt);
  }

  function renderPricing(pricingData) {
    var hasDiscount = pricingData.discountPercentage > 0 && Boolean(pricingData.couponCode);
    var hasPppDiscount = hasDiscount && pricingData.tier > 1;
    var isEarlyBird = hasDiscount && pricingData.earlyBird;
    var discountPercentage = hasDiscount ? pricingData.discountPercentage : 0;
    var productCards = pricingRoot.querySelectorAll('[data-ppp-product]');

    Array.prototype.forEach.call(productCards, function (productCard) {
      var priceElement = productCard.querySelector('[data-ppp-price]');
      var originalPriceElement = productCard.querySelector('[data-ppp-original-price]');
      var earlyBirdBadge = productCard.querySelector('[data-ppp-early-bird-badge]');
      var ctaLink = productCard.querySelector('[data-ppp-cta]');

      if (priceElement) {
        var basePrice = Number(priceElement.getAttribute('data-ppp-base-price'));
        var currency = priceElement.getAttribute('data-ppp-currency') || '';
        if (!isNaN(basePrice)) {
          priceElement.textContent = formatAmount(basePrice * (100 - discountPercentage) / 100) + currency;
        }
      }

      if (originalPriceElement) originalPriceElement.classList.toggle('hidden', !hasDiscount);
      if (earlyBirdBadge) earlyBirdBadge.classList.toggle('hidden', !isEarlyBird);

      if (ctaLink) {
        var href = ctaLink.getAttribute('href');
        if (href && href !== '#') {
          try {
            var checkoutUrl = new URL(href, window.location.href);
            checkoutUrl.searchParams.delete('promocode');
            if (hasDiscount) checkoutUrl.searchParams.set('promocode', pricingData.couponCode);
            ctaLink.setAttribute('href', checkoutUrl.toString());
          } catch (error) {
            // Malformed href: leave the link untouched.
          }
        }
      }
    });

    var earlyBirdSlots = document.querySelectorAll('[data-ppp-early-bird-only]');
    Array.prototype.forEach.call(earlyBirdSlots, function (slot) {
      slot.classList.toggle('hidden', !(hasPppDiscount && isEarlyBird));
    });

    var noteElement = pricingRoot.querySelector('[data-ppp-note]');
    if (noteElement) noteElement.classList.toggle('hidden', !hasPppDiscount);

    isBannerEligible = hasPppDiscount;
    updateBannerVisibility();

    if (!hasPppDiscount) return;

    fillSlots('[data-ppp-country-name]', resolveCountryName(pricingData));
    fillSlots('[data-ppp-flag]', countryFlag(pricingData.country));
    fillSlots('[data-ppp-discount-percentage]', String(discountPercentage));
    fillSlots('[data-ppp-coupon-code]', pricingData.couponCode);
  }

  // Whole amounts without decimals (490), others with cents (328.30).
  function formatAmount(amount) {
    var cents = Math.round(amount * 100);
    return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  }

  function fillSlots(selector, text) {
    var slots = document.querySelectorAll(selector);
    Array.prototype.forEach.call(slots, function (slot) {
      slot.textContent = text;
    });
  }

  function resolveCountryName(pricingData) {
    if (pricingData.countryName) return pricingData.countryName;
    if (pricingData.country && window.Intl && Intl.DisplayNames) {
      try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(pricingData.country) || pricingData.country;
      } catch (error) {
        // Fall through to the raw code.
      }
    }
    return pricingData.country || 'your country';
  }

  // Regional indicator symbols: "IN" -> the flag of India
  function countryFlag(countryCode) {
    if (!COUNTRY_PATTERN.test(countryCode)) return '';
    return String.fromCodePoint(
      0x1F1E6 + countryCode.charCodeAt(0) - 65,
      0x1F1E6 + countryCode.charCodeAt(1) - 65
    );
  }

  function readCachedData() {
    var cachedValue = readStorage(CACHE_KEY);
    if (!cachedValue) return null;
    try {
      return normalizeData(JSON.parse(cachedValue));
    } catch (error) {
      return null;
    }
  }

  // sessionStorage can throw (private mode, blocked storage) - never let that break pricing.
  function readStorage(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Ignore: caching is a convenience only.
    }
  }
})();
