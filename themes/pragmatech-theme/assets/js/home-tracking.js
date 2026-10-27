// Homepage tracking (Matomo events) and the sticky mobile CTA.
// Events: cta_team_edition, cta_free_check, cta_book_call, cta_course (clicks on [data-track],
// the position is sent as event name), checkout_started (links with [data-checkout]) and
// scroll_pricing (section [data-track-visible] enters the viewport).
(function () {
  'use strict';

  function trackEvent(category, action, name) {
    var queue = window._paq = window._paq || [];
    queue.push(['trackEvent', category, action, name]);
  }

  function wireClicks() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('[data-track]') : null;
      if (!link) return;
      var position = link.getAttribute('data-track-position') || 'unknown';
      trackEvent('home', link.getAttribute('data-track'), position);
      if (link.hasAttribute('data-checkout')) {
        trackEvent('home', 'checkout_started', position);
      }
    });
  }

  function wireVisibility() {
    var sections = document.querySelectorAll('[data-track-visible]');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        trackEvent('home', entry.target.getAttribute('data-track-visible'), 'visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    sections.forEach(function (section) { observer.observe(section); });
  }

  // Sticky "Team Edition" button on mobile: visible from the problem section until the pricing section.
  function wireStickyCta() {
    var sticky = document.querySelector('[data-sticky-cta]');
    var problem = document.getElementById('problem');
    var pricing = document.getElementById('pricing');
    if (!sticky || !problem) return;
    function update() {
      var pastProblem = problem.getBoundingClientRect().top <= window.innerHeight * 0.5;
      var pricingRect = pricing ? pricing.getBoundingClientRect() : null;
      var inPricing = pricingRect && pricingRect.top < window.innerHeight && pricingRect.bottom > 0;
      sticky.classList.toggle('hidden', !pastProblem || !!inPricing);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // Remotion animations play while they are in view (not with prefers-reduced-motion).
  function wireScrollVideos() {
    var videos = document.querySelectorAll('[data-scroll-video]');
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!videos.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var playPromise = entry.target.play();
          if (playPromise) playPromise.catch(function () {});
        } else if (entry.target.loop) {
          entry.target.pause();
        }
      });
    }, { threshold: 0.4 });
    videos.forEach(function (video) { observer.observe(video); });
  }

  function init() {
    wireScrollVideos();
    wireClicks();
    wireVisibility();
    wireStickyCta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
