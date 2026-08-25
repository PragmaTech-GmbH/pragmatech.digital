// Purchase Power Parity pricing for course landing pages (layout: course-landing).
// Calls the Netlify Edge Function at /api/ppp once per session and adjusts the
// pre-rendered pricing cards: prices, checkout links (promocode), a note and a banner.
// The page is fully usable without this script or when the endpoint fails: base
// prices and plain checkout links are already in the HTML. Nothing from the response
// is injected as HTML - only textContent and URL parameters.
(function () {
  var pricingRoot = document.querySelector('[data-ppp-root]');
  if (!pricingRoot) return;

  var CACHE_KEY = 'ppp:v1';
  var BANNER_DISMISSED_KEY = 'ppp:bannerDismissed';
  var REQUEST_TIMEOUT_MS = 3000;
  var COUPON_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
  var COUNTRY_PATTERN = /^[A-Z]{2}$/;

  var pageParams = new URLSearchParams(window.location.search);
  var testCountry = pageParams.get('country');
  var testToken = pageParams.get('token');
  var isTestMode = Boolean(testCountry);

  var bannerElement = document.querySelector('[data-ppp-banner]');
  var bannerCloseButton = document.querySelector('[data-ppp-banner-close]');
  if (bannerElement && bannerCloseButton) {
    bannerCloseButton.addEventListener('click', function () {
      bannerElement.classList.add('hidden');
      writeStorage(BANNER_DISMISSED_KEY, '1');
    });
  }

  var cachedData = isTestMode ? null : readCachedData();
  if (cachedData) {
    applyPricing(cachedData);
    return;
  }

  var apiParams = new URLSearchParams();
  if (testCountry) apiParams.set('country', testCountry);
  if (testToken) apiParams.set('token', testToken);
  var apiUrl = '/api/ppp' + (apiParams.toString() ? '?' + apiParams.toString() : '');

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
      if (!isTestMode) writeStorage(CACHE_KEY, JSON.stringify(pricingData));
      if (window._paq) {
        window._paq.push(['trackEvent', 'PPP', 'tier-' + pricingData.tier, pricingData.country || 'unknown']);
      }
      applyPricing(pricingData);
    })
    .catch(function () {
      // Timeout, network error, non-2xx or invalid JSON: keep the base prices.
    })
    .finally(function () {
      clearTimeout(timeoutTimer);
    });

  // Validates the endpoint response. Anything unexpected degrades to "no discount".
  function normalizeData(rawData) {
    var noDiscount = { country: '', countryName: '', tier: 1, discountPercentage: 0, couponCode: null };
    if (!rawData || typeof rawData !== 'object') return noDiscount;

    var country = typeof rawData.country === 'string' && COUNTRY_PATTERN.test(rawData.country) ? rawData.country : '';
    var tier = rawData.tier;
    var discountPercentage = rawData.discountPercentage;
    var couponCode = rawData.couponCode;

    var isValidTier = Number.isInteger(tier) && tier >= 2 && tier <= 4;
    var isValidPercentage = typeof discountPercentage === 'number' && discountPercentage > 0 && discountPercentage <= 100;
    var isValidCoupon = typeof couponCode === 'string' && COUPON_PATTERN.test(couponCode);

    if (!isValidTier || !isValidPercentage || !isValidCoupon) {
      noDiscount.country = country;
      return noDiscount;
    }

    return {
      country: country,
      countryName: typeof rawData.countryName === 'string' ? rawData.countryName : '',
      tier: tier,
      discountPercentage: discountPercentage,
      couponCode: couponCode
    };
  }

  function applyPricing(pricingData) {
    if (pricingData.tier === 1 || !pricingData.couponCode || pricingData.discountPercentage <= 0) return;

    var discountPercentage = pricingData.discountPercentage;
    var productCards = pricingRoot.querySelectorAll('[data-ppp-product]');

    Array.prototype.forEach.call(productCards, function (productCard) {
      var priceElement = productCard.querySelector('[data-ppp-price]');
      var originalPriceElement = productCard.querySelector('[data-ppp-original-price]');
      var ctaLink = productCard.querySelector('[data-ppp-cta]');

      if (priceElement) {
        var basePrice = Number(priceElement.getAttribute('data-ppp-base-price'));
        var currency = priceElement.getAttribute('data-ppp-currency') || '';
        if (!isNaN(basePrice)) {
          var adjustedPrice = Math.round(basePrice * (100 - discountPercentage) / 100);
          priceElement.textContent = adjustedPrice + currency;
        }
      }

      if (originalPriceElement) originalPriceElement.classList.remove('hidden');

      if (ctaLink) {
        var href = ctaLink.getAttribute('href');
        if (href && href !== '#') {
          try {
            var checkoutUrl = new URL(href, window.location.href);
            checkoutUrl.searchParams.set('promocode', pricingData.couponCode);
            ctaLink.setAttribute('href', checkoutUrl.toString());
          } catch (error) {
            // Malformed href: leave the link untouched.
          }
        }
      }
    });

    fillSlots('[data-ppp-country-name]', resolveCountryName(pricingData));
    fillSlots('[data-ppp-flag]', countryFlag(pricingData.country));
    fillSlots('[data-ppp-discount-percentage]', String(discountPercentage));
    fillSlots('[data-ppp-coupon-code]', pricingData.couponCode);

    var noteElement = pricingRoot.querySelector('[data-ppp-note]');
    if (noteElement) noteElement.classList.remove('hidden');

    if (bannerElement && readStorage(BANNER_DISMISSED_KEY) !== '1') {
      bannerElement.classList.remove('hidden');
    }
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
