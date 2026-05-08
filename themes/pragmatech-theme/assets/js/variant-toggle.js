// Homepage variant toggle + FAQ accordion behaviour.
// Pre-paint init lives in head.html; this file wires up clicks after DOM is ready.
(function () {
  'use strict';

  var STORAGE_KEY = 'homepageVariant';
  var THEME_KEY = 'homepageVariantATheme';
  var ALLOWED = ['a', 'b', 'c'];
  var THEMES = ['dark', 'light'];

  function readPersisted() {
    try {
      var queryMatch = (window.location.search.match(/[?&]variant=([abc])/i) || [])[1];
      if (queryMatch) {
        return queryMatch.toLowerCase();
      }
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (ALLOWED.indexOf(stored) !== -1) {
        return stored;
      }
    } catch (e) {}
    return 'a';
  }

  function applyVariant(variant) {
    if (ALLOWED.indexOf(variant) === -1) variant = 'a';

    document.documentElement.setAttribute('data-active-variant', variant);
    try { window.localStorage.setItem(STORAGE_KEY, variant); } catch (e) {}

    var buttons = document.querySelectorAll('.variant-toggle-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var isActive = btn.getAttribute('data-variant-target') === variant;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('variant-toggle-btn--active', isActive);
    }

    var themeToggle = document.getElementById('variant-a-theme-toggle');
    if (themeToggle) {
      if (variant === 'a') {
        themeToggle.classList.remove('hidden');
        themeToggle.classList.add('flex');
      } else {
        themeToggle.classList.add('hidden');
        themeToggle.classList.remove('flex');
      }
    }
  }

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'dark';

    document.documentElement.setAttribute('data-variant-a-theme', theme);
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) {}

    var buttons = document.querySelectorAll('.theme-toggle-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var isActive = btn.getAttribute('data-theme-target') === theme;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('theme-toggle-btn--active', isActive);
    }
  }

  function readPersistedTheme() {
    try {
      var stored = window.localStorage.getItem(THEME_KEY);
      if (THEMES.indexOf(stored) !== -1) return stored;
    } catch (e) {}
    return 'dark';
  }

  function wireToggleClicks() {
    var buttons = document.querySelectorAll('.variant-toggle-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) {
        var target = e.currentTarget.getAttribute('data-variant-target');
        applyVariant(target);
        // scroll back to top so users see the new hero
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var themeButtons = document.querySelectorAll('.theme-toggle-btn');
    for (var j = 0; j < themeButtons.length; j++) {
      themeButtons[j].addEventListener('click', function (e) {
        var target = e.currentTarget.getAttribute('data-theme-target');
        applyTheme(target);
      });
    }
  }

  function wireFaqAccordions() {
    var triggers = document.querySelectorAll('.faq-trigger');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function (e) {
        var trigger = e.currentTarget;
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        var panelId = trigger.getAttribute('aria-controls');
        var panel = panelId ? document.getElementById(panelId) : null;
        var chevron = trigger.querySelector('.faq-chevron');

        trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (panel) panel.classList.toggle('hidden', expanded);
        if (chevron) chevron.style.transform = expanded ? '' : 'rotate(180deg)';
      });
    }
  }

  function init() {
    applyVariant(readPersisted());
    applyTheme(readPersistedTheme());
    wireToggleClicks();
    wireFaqAccordions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
