// Homepage FAQ accordion behaviour.
(function () {
  'use strict';

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireFaqAccordions);
  } else {
    wireFaqAccordions();
  }
})();
