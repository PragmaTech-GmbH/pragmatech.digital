// MailerLite signup of the 3-PDF bundle landing page (layout: lp-bundle).
// Submits with JSONP, so we can read MailerLite's {success, errors} response and redirect
// only after a real success. Nothing is stored on the visitor's device.
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('lead-bundle-form');
  if (!signupForm) return;

  const submitButton = document.getElementById('lead-bundle-submit');
  const errorMessage = document.getElementById('lead-bundle-error');
  const fallbackMessage = document.getElementById('lead-bundle-fallback');
  const buttonLabel = submitButton.textContent;
  const requestTimeoutMillis = 10000;
  const trackingTimeoutMillis = 800;
  let callbackCounter = 0;

  submitButton.disabled = false;

  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const readField = (fieldName) => signupForm.elements[`fields[${fieldName}]`].value.trim();
    if (!readField('name')) return showError('Please enter your name.');
    if (!readField('company')) return showError('Please enter your company.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(readField('email'))) {
      return showError('Please enter a valid email address.');
    }

    errorMessage.classList.add('hidden');
    fallbackMessage.classList.add('hidden');
    submitButton.disabled = true;
    submitButton.textContent = signupForm.dataset.pendingLabel;
    subscribe();
  });

  function subscribe() {
    callbackCounter += 1;
    const callbackName = `leadBundleCallback${callbackCounter}`;
    const queryParameters = new URLSearchParams(new FormData(signupForm));
    queryParameters.set('ajax', '1');
    queryParameters.set('callback', callbackName);

    const jsonpScript = document.createElement('script');
    const timeoutTimer = setTimeout(() => fail(), requestTimeoutMillis);

    const cleanUp = () => {
      clearTimeout(timeoutTimer);
      jsonpScript.remove();
      // A late response after a timeout must find a harmless function.
      window[callbackName] = () => {};
    };

    const fail = (message) => {
      cleanUp();
      submitButton.disabled = false;
      submitButton.textContent = buttonLabel;
      showError(message || 'Something went wrong - please try again.');
      fallbackMessage.classList.remove('hidden');
    };

    window[callbackName] = (response) => {
      if (response && response.success === true) {
        cleanUp();
        trackSignupAndRedirect();
        return;
      }
      // Never inject MailerLite's own error markup, map it to our copy.
      const fieldErrors = response && response.errors && response.errors.fields;
      fail(fieldErrors && fieldErrors.email ? 'Please enter a valid email address.' : undefined);
    };

    jsonpScript.onerror = () => fail('Network error - please try again.');
    jsonpScript.src = `${signupForm.action}?${queryParameters.toString()}`;
    document.body.appendChild(jsonpScript);
  }

  function trackSignupAndRedirect() {
    let hasRedirected = false;
    const redirect = () => {
      if (hasRedirected) return;
      hasRedirected = true;
      window.location.assign(signupForm.dataset.thankYouUrl);
    };

    // The event carries the redirect as callback. The timer covers a blocked or slow tracker.
    // Read window._paq only now: matomo.js loads async and replaces the array that exists on page load.
    window._paq = window._paq || [];
    window._paq.push(['trackEvent', 'LeadMagnet', 'Signup', signupForm.dataset.campaign, undefined, undefined, redirect]);
    setTimeout(redirect, trackingTimeoutMillis);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }
});
