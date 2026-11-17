// Purchase Power Parity pricing for course landing pages (layout: course-landing).
// Calls the Netlify Edge Function at /api/ppp once per session and renders the
// pricing cards from its answer: prices, checkout links (promocode), a note and a
// banner. While the request runs, a spinner covers the prices. The banner shows top
// right once the visitor scrolls. Before the endpoint answers, the page shows the list
// price; when the endpoint fails, the list price stays. Nothing from the response is
// injected as HTML - only textContent and URL parameters.
(function () {
  var pricingRoot = document.querySelector('[data-ppp-root]');
  if (!pricingRoot) return;

  var CACHE_KEY = 'ppp:v4';
  // Short cache, so a visitor who keeps a tab open still sees a campaign start or end.
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var BANNER_DISMISSED_KEY = 'ppp:bannerDismissed';
  var REQUEST_TIMEOUT_MS = 3000;
  var COUPON_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
  var COUNTRY_PATTERN = /^[A-Z]{2}$/;
  var BANNER_SCROLL_THRESHOLD_PX = 80;

  var pageParams = new URLSearchParams(window.location.search);
  var testCountry = pageParams.get('country');
  var testToken = pageParams.get('token');
  var testNow = pageParams.get('now');
  var isTestMode = Boolean(testCountry || testNow);

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

  renderPricing(noDiscount());

  // Visual preview of the Black Friday deal: ?bf=true[&tier=1-4]. Skips the endpoint and
  // shows a fake 6 hour countdown, so it works with plain `hugo serve`. Allowed on localhost
  // and Netlify preview hosts only, never on the production domain. The coupon is a placeholder.
  if (pageParams.get('bf') === 'true' && isPreviewHost()) {
    renderPricing(buildBlackFridayPreview(Number(pageParams.get('tier')) || 1));
    return;
  }

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
      if (!isTestMode) writeStorage(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: rawData }));
      if (window._paq) {
        var eventName = 'tier-' + pricingData.tier;
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

  function isPreviewHost() {
    var hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || /\.netlify\.app$/.test(hostname);
  }

  function buildBlackFridayPreview(tier) {
    var previewTiers = {
      1: { country: 'DE', countryName: 'Germany', ppp: 0, total: 30 },
      2: { country: 'ES', countryName: 'Spain', ppp: 30, total: 51 },
      3: { country: 'BR', countryName: 'Brazil', ppp: 50, total: 65 },
      4: { country: 'IN', countryName: 'India', ppp: 70, total: 79 }
    };
    var previewTier = previewTiers[tier] || previewTiers[1];
    var selectedTier = previewTiers[tier] ? tier : 1;
    return {
      country: previewTier.country,
      countryName: previewTier.countryName,
      tier: selectedTier,
      discountPercentage: previewTier.total,
      pppDiscountPercentage: previewTier.ppp,
      couponCode: 'BF-PREVIEW',
      campaign: { endsAtMs: Date.now() + 6 * 3600 * 1000 }
    };
  }

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
      campaign: null
    };
  }

  // Validates the endpoint response. A valid "no discount" answer resets to the list
  // price; anything unexpected returns null and keeps the list price.
  function normalizeData(rawData) {
    if (!rawData || typeof rawData !== 'object') return null;

    var country = typeof rawData.country === 'string' && COUNTRY_PATTERN.test(rawData.country) ? rawData.country : '';
    var tier = rawData.tier;
    if (!Number.isInteger(tier) || tier < 1 || tier > 4) return null;

    var campaign = normalizeCampaign(rawData.campaign);
    if (rawData.discountPercentage === 0 && rawData.couponCode === null) {
      var noDiscountData = noDiscount(country);
      noDiscountData.campaign = campaign;
      return noDiscountData;
    }

    var pricingData = {
      country: country,
      countryName: typeof rawData.countryName === 'string' ? rawData.countryName : '',
      tier: tier,
      discountPercentage: rawData.discountPercentage,
      pppDiscountPercentage: typeof rawData.pppDiscountPercentage === 'number' ? rawData.pppDiscountPercentage : rawData.discountPercentage,
      couponCode: rawData.couponCode,
      campaign: normalizeCampaign(rawData.campaign)
    };
    if (!isValidDiscount(pricingData)) return null;
    return pricingData;
  }

  // A campaign (Black Friday) needs a valid end time in the future, otherwise it is ignored.
  function normalizeCampaign(rawCampaign) {
    if (!rawCampaign || typeof rawCampaign !== 'object') return null;
    var endsAtMs = typeof rawCampaign.endsAt === 'string' ? Date.parse(rawCampaign.endsAt) : NaN;
    if (isNaN(endsAtMs) || endsAtMs <= Date.now()) return null;
    return { endsAtMs: endsAtMs };
  }

  function isValidDiscount(pricingData) {
    var discountPercentage = pricingData.discountPercentage;
    var isValidPercentage = typeof discountPercentage === 'number' && discountPercentage > 0 && discountPercentage <= 100;
    var isValidCoupon = typeof pricingData.couponCode === 'string' && COUPON_PATTERN.test(pricingData.couponCode);
    // Tiers 2-4 carry a PPP discount; tier 1 only carries one during a campaign.
    return isValidPercentage && isValidCoupon && (pricingData.tier > 1 || Boolean(pricingData.campaign));
  }

  function renderPricing(pricingData) {
    var hasDiscount = pricingData.discountPercentage > 0 && Boolean(pricingData.couponCode);
    var hasPppDiscount = hasDiscount && pricingData.tier > 1;
    var discountPercentage = hasDiscount ? pricingData.discountPercentage : 0;
    var productCards = pricingRoot.querySelectorAll('[data-ppp-product]');

    Array.prototype.forEach.call(productCards, function (productCard) {
      var priceElement = productCard.querySelector('[data-ppp-price]');
      var originalPriceElement = productCard.querySelector('[data-ppp-original-price]');
      var ctaLink = productCard.querySelector('[data-ppp-cta]');

      if (priceElement) {
        var basePrice = Number(priceElement.getAttribute('data-ppp-base-price'));
        var currency = priceElement.getAttribute('data-ppp-currency') || '';
        if (!isNaN(basePrice)) {
          priceElement.textContent = formatAmount(basePrice * (100 - discountPercentage) / 100) + currency;
        }
      }

      if (originalPriceElement) originalPriceElement.classList.toggle('hidden', !hasDiscount);

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

    var noteElement = pricingRoot.querySelector('[data-ppp-note]');
    if (noteElement) noteElement.classList.toggle('hidden', !hasPppDiscount);

    isBannerEligible = hasPppDiscount;
    updateBannerVisibility();
    renderCampaign(pricingData);

    if (!hasPppDiscount) return;

    fillSlots('[data-ppp-country-name]', resolveCountryName(pricingData));
    fillSlots('[data-ppp-flag]', countryFlag(pricingData.country));
    fillSlots('[data-ppp-discount-percentage]', String(pricingData.pppDiscountPercentage));
    fillSlots('[data-ppp-coupon-code]', pricingData.couponCode);
  }

  // Black Friday banner, bonus labels and live countdown. Hidden again when the end time
  // passes: the cache is dropped and the endpoint is asked once more, because the PPP
  // discount may still apply after the campaign.
  var countdownTimer = null;

  function renderCampaign(pricingData) {
    var campaign = pricingData.campaign;
    var bannerElements = document.querySelectorAll('[data-bf-banner], [data-bf-bonus]');
    Array.prototype.forEach.call(bannerElements, function (element) {
      element.classList.toggle('hidden', !campaign);
    });

    var pppHint = document.querySelector('[data-bf-ppp-hint]');
    if (pppHint) {
      pppHint.classList.toggle('hidden', !(Boolean(campaign) && pricingData.tier > 1));
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (!campaign) return;

    updateCountdown(campaign.endsAtMs);
    countdownTimer = setInterval(function () {
      updateCountdown(campaign.endsAtMs);
    }, 1000);
  }

  function updateCountdown(endsAtMs) {
    var remainingSeconds = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
    var hours = Math.floor(remainingSeconds / 3600);
    var minutes = Math.floor((remainingSeconds % 3600) / 60);
    var seconds = remainingSeconds % 60;
    fillSlots('[data-bf-hours]', pad(hours));
    fillSlots('[data-bf-minutes]', pad(minutes));
    fillSlots('[data-bf-seconds]', pad(seconds));

    if (remainingSeconds === 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      try {
        window.sessionStorage.removeItem(CACHE_KEY);
      } catch (error) {
        // Ignore: caching is a convenience only.
      }
      window.location.reload();
    }
  }

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
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
      var cachedEntry = JSON.parse(cachedValue);
      if (!cachedEntry || Date.now() - cachedEntry.cachedAt > CACHE_TTL_MS) return null;
      return normalizeData(cachedEntry.data);
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
