// Mailchimp signup for the course landing page (layout: course-landing).
// All identifiers (action URL, tag id, honeypot name) come from data-attributes
// rendered from params.mailchimp in hugo.yaml - no keys live in this file.
// Submission uses JSONP because Mailchimp's list-manage endpoints send no CORS
// headers, and JSONP is the only way to read the {result, msg} response for an
// inline success/error message.
(function () {
  var signupForm = document.getElementById('course-signup-form');
  if (!signupForm) return;

  var successMessage = document.getElementById('course-signup-success');
  var alreadySubscribedMessage = document.getElementById('course-signup-already');
  var errorMessage = document.getElementById('course-signup-error');
  var submitButton = document.getElementById('course-signup-submit');
  var callbackCounter = 0;

  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var emailValue = signupForm.elements['EMAIL'].value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      showError('Please enter a valid email address.');
      return;
    }

    submitButton.disabled = true;
    errorMessage.classList.add('hidden');

    callbackCounter += 1;
    var callbackName = 'mcCourseSignupCallback' + callbackCounter;
    var requestUrl = signupForm.dataset.actionUrl.replace('/subscribe/post?', '/subscribe/post-json?')
      + '&EMAIL=' + encodeURIComponent(emailValue)
      + '&tags=' + encodeURIComponent(signupForm.dataset.tagId)
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
        // the tag is applied, but the confirm-your-inbox copy would be wrong.
        signupForm.classList.add('hidden');
        if (/already subscribed/i.test(String(response.msg || ''))) {
          alreadySubscribedMessage.classList.remove('hidden');
        } else {
          successMessage.classList.remove('hidden');
        }
        if (window._paq) {
          window._paq.push(['trackEvent', 'Course', 'Signup', 'agentic-spring-boot-testing']);
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
