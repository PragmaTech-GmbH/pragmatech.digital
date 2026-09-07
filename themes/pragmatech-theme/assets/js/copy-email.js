// Copy-to-clipboard for the "convince your manager" email template
// (layout: convince-your-manager). The subject and body live in the DOM
// (#email-subject, #email-body); their textContent is the plain text that
// gets copied, so highlighted placeholders copy as plain [brackets].
(function () {
  var subjectElement = document.getElementById('email-subject');
  var bodyElement = document.getElementById('email-body');
  if (!subjectElement || !bodyElement) return;

  function normalizeText(rawText) {
    return rawText.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
  }

  function getSubject() {
    return normalizeText(subjectElement.textContent).replace(/\s+/g, ' ').trim();
  }

  function getBody() {
    return normalizeText(bodyElement.textContent);
  }

  function copyText(textToCopy) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(textToCopy);
    }
    return new Promise(function (resolve, reject) {
      var helperTextarea = document.createElement('textarea');
      helperTextarea.value = textToCopy;
      helperTextarea.setAttribute('readonly', '');
      helperTextarea.style.position = 'fixed';
      helperTextarea.style.top = '-1000px';
      document.body.appendChild(helperTextarea);
      helperTextarea.select();
      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('copy failed'));
        }
      } catch (copyError) {
        reject(copyError);
      } finally {
        document.body.removeChild(helperTextarea);
      }
    });
  }

  function showFeedback(buttonElement, labelText, isError) {
    var originalHtml = buttonElement.getAttribute('data-original-html') || buttonElement.innerHTML;
    buttonElement.setAttribute('data-original-html', originalHtml);
    buttonElement.classList.toggle('is-copied', !isError);
    buttonElement.classList.toggle('is-error', !!isError);
    buttonElement.innerHTML = labelText;
    window.clearTimeout(buttonElement.feedbackTimer);
    buttonElement.feedbackTimer = window.setTimeout(function () {
      buttonElement.innerHTML = originalHtml;
      buttonElement.classList.remove('is-copied', 'is-error');
    }, 2200);
  }

  var copyTargets = {
    subject: getSubject,
    body: getBody,
    all: function () {
      return 'Subject: ' + getSubject() + '\n\n' + getBody();
    }
  };

  var copyButtons = document.querySelectorAll('[data-copy]');
  Array.prototype.forEach.call(copyButtons, function (buttonElement) {
    buttonElement.addEventListener('click', function () {
      var targetName = buttonElement.getAttribute('data-copy');
      var textProvider = copyTargets[targetName];
      if (!textProvider) return;

      copyText(textProvider()).then(function () {
        showFeedback(buttonElement, buttonElement.getAttribute('data-copied-label') || 'Copied!', false);
      }).catch(function () {
        showFeedback(buttonElement, 'Copy failed - select the text manually', true);
      });
    });
  });

  // Prefill the "Open in mail app" link with subject and body.
  var mailtoLink = document.getElementById('email-mailto');
  if (mailtoLink) {
    mailtoLink.setAttribute('href',
      'mailto:?subject=' + encodeURIComponent(getSubject()) +
      '&body=' + encodeURIComponent(getBody()));
  }
})();
