// Animated Claude Code sessions in the course landing page demo (layout: course-landing).
// The full transcript is in the HTML. This script hides the lines on load and replays
// both panels as a typed session once the section scrolls into view. It does nothing
// when the user prefers reduced motion, so the static transcript stays visible.
// Only classes that already exist in the markup are toggled (hidden) - Tailwind emits
// classes from rendered templates only.
(function () {
  var demoRoot = document.querySelector('[data-demo-root]');
  if (!demoRoot) return;

  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var TYPE_INTERVAL_MS = 35;
  var DEFAULT_DELAY_MS = 350;
  var DEFAULT_HOLD_MS = 900;

  var panels = Array.prototype.slice.call(demoRoot.querySelectorAll('[data-demo-panel]'));
  var replayButton = demoRoot.querySelector('[data-demo-replay]');
  var speedFactor = Number(demoRoot.getAttribute('data-demo-speed')) || 1;
  var runToken = 0;

  function wait(milliseconds) {
    return new Promise(function (resolve) {
      setTimeout(resolve, milliseconds / speedFactor);
    });
  }

  function prepare(panel) {
    var lines = panel.querySelectorAll('[data-demo-line]');
    Array.prototype.forEach.call(lines, function (line) {
      line.classList.add('hidden');
      var textElement = line.querySelector('[data-demo-text]');
      if (textElement && textElement.dataset.demoFull === undefined) {
        textElement.dataset.demoFull = textElement.textContent;
      }
      var spinner = line.querySelector('[data-demo-spinner]');
      if (spinner) spinner.classList.add('hidden');
    });
    var cursor = panel.querySelector('[data-demo-cursor]');
    if (cursor) cursor.classList.remove('hidden');
  }

  async function typeText(textElement, token) {
    var fullText = textElement.dataset.demoFull || '';
    textElement.textContent = '';
    for (var index = 0; index < fullText.length; index++) {
      if (token !== runToken) return;
      textElement.textContent += fullText.charAt(index);
      await wait(TYPE_INTERVAL_MS);
    }
  }

  async function play(panel, token) {
    var lines = Array.prototype.slice.call(panel.querySelectorAll('[data-demo-line]'));

    for (var index = 0; index < lines.length; index++) {
      var line = lines[index];
      if (token !== runToken) return;

      var lineType = line.getAttribute('data-demo-type');
      var delayMs = Number(line.getAttribute('data-demo-delay')) || DEFAULT_DELAY_MS;
      await wait(delayMs);
      if (token !== runToken) return;

      var textElement = line.querySelector('[data-demo-text]');

      if ((lineType === 'cmd' || lineType === 'user') && textElement) {
        textElement.textContent = '';
        line.classList.remove('hidden');
        await typeText(textElement, token);
      } else if (lineType === 'thinking') {
        var spinner = line.querySelector('[data-demo-spinner]');
        if (spinner) spinner.classList.remove('hidden');
        line.classList.remove('hidden');
        await wait(Number(line.getAttribute('data-demo-hold')) || DEFAULT_HOLD_MS);
        if (spinner) spinner.classList.add('hidden');
      } else {
        line.classList.remove('hidden');
      }
    }

    if (token !== runToken) return;
    var cursor = panel.querySelector('[data-demo-cursor]');
    if (cursor) cursor.classList.add('hidden');
  }

  async function runSessions() {
    runToken += 1;
    var token = runToken;
    if (replayButton) replayButton.classList.add('hidden');

    panels.forEach(prepare);
    await Promise.all(panels.map(function (panel) {
      return play(panel, token);
    }));

    if (token === runToken && replayButton) replayButton.classList.remove('hidden');
  }

  var replayTrigger = demoRoot.querySelector('[data-demo-replay-button]');
  if (replayTrigger) {
    replayTrigger.addEventListener('click', function () {
      runSessions();
    });
  }

  // Hide the transcript now (JavaScript is available), play when the section is in view.
  panels.forEach(prepare);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      var isVisible = entries.some(function (entry) {
        return entry.isIntersecting;
      });
      if (!isVisible) return;
      observer.disconnect();
      runSessions();
    }, { threshold: 0.25 });
    observer.observe(demoRoot);
  } else {
    runSessions();
  }
})();
