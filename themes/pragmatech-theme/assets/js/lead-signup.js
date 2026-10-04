// Mailchimp signup for lead magnet landing pages (layout: lp-lead-magnet).
// All identifiers (action URL, tag id, honeypot name, campaign name) come from
// data-attributes rendered from params.mailchimp in hugo.yaml - no keys live here.
// Submission uses JSONP because Mailchimp's list-manage endpoints send no CORS
// headers, and JSONP is the only way to read the {result, msg} response for an
// inline success/error message.
(function () {
  var signupForm = document.getElementById('lead-signup-form');
  if (!signupForm) return;

  var successMessage = document.getElementById('lead-signup-success');
  var alreadySubscribedMessage = document.getElementById('lead-signup-already');
  var errorMessage = document.getElementById('lead-signup-error');
  var submitButton = document.getElementById('lead-signup-submit');
  var callbackCounter = 0;

  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var firstNameValue = signupForm.elements['FNAME'].value.trim();
    var emailValue = signupForm.elements['EMAIL'].value.trim();
    if (!firstNameValue) {
      showError('Please enter your first name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      showError('Please enter a valid email address.');
      return;
    }

    submitButton.disabled = true;
    errorMessage.classList.add('hidden');

    callbackCounter += 1;
    var callbackName = 'mcLeadSignupCallback' + callbackCounter;
    var requestUrl = signupForm.dataset.actionUrl.replace('/subscribe/post?', '/subscribe/post-json?')
      + '&FNAME=' + encodeURIComponent(firstNameValue)
      + '&EMAIL=' + encodeURIComponent(emailValue)
      + (signupForm.dataset.tagId ? '&tags=' + encodeURIComponent(signupForm.dataset.tagId) : '')
      + '&' + encodeURIComponent(signupForm.dataset.honeypot) + '='
      + '&c=' + callbackName;

    var jsonpScript = document.createElement('script');
    var timeoutTimer = setTimeout(function () {
      cleanup();
      showError('Network error - please try again.');
    }, 10000);

    window[callbackName] = function (response) {
      clearTimeout(timeoutTimer);
      cleanup();
      if (response.result === 'success') {
        // Mailchimp reports existing subscribers as success too, with
        // "You're already subscribed, your profile has been updated." -
        // the tag is applied, so the automation still runs.
        if (window._paq) {
          window._paq.push(['trackEvent', 'LeadMagnet', 'Signup', signupForm.dataset.campaign]);
        }
        // New and existing subscribers both go to the thank-you page, which
        // explains the double opt-in and the emails that follow.
        if (signupForm.dataset.thankYouUrl) {
          window.location.assign(signupForm.dataset.thankYouUrl);
          return;
        }
        signupForm.classList.add('hidden');
        if (/already subscribed/i.test(String(response.msg || ''))) {
          alreadySubscribedMessage.classList.remove('hidden');
        } else {
          successMessage.classList.remove('hidden');
        }
      } else {
        // Mailchimp's msg can contain raw HTML (e.g. an "update your profile"
        // link) - map known cases to our own copy and never inject it.
        var responseText = String(response.msg || '').replace(/^\d+\s*-\s*/, '');
        if (/already subscribed/i.test(responseText)) {
          signupForm.classList.add('hidden');
          alreadySubscribedMessage.classList.remove('hidden');
        } else if (/invalid|enter a value/i.test(responseText)) {
          showError('Please enter a valid email address.');
        } else {
          showError('Something went wrong - please try again later.');
        }
      }
    };

    jsonpScript.onerror = function () {
      clearTimeout(timeoutTimer);
      cleanup();
      showError('Network error - please try again.');
    };
    jsonpScript.src = requestUrl;
    document.body.appendChild(jsonpScript);

    function cleanup() {
      submitButton.disabled = false;
      jsonpScript.remove();
      delete window[callbackName];
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }
})();
