// MailerLite signup of the 3-PDF bundle landing page (layout: lp-bundle).
// Submits with fetch, so we can read MailerLite's {success, errors} response and redirect
// only after a real success. JSONP does not work: MailerLite answers with plain JSON, and
// browsers block that as a script (ERR_BLOCKED_BY_ORB). Nothing is stored on the visitor's device.
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('lead-bundle-form');
  if (!signupForm) return;

  const submitButton = document.getElementById('lead-bundle-submit');
  const errorMessage = document.getElementById('lead-bundle-error');
  const fallbackMessage = document.getElementById('lead-bundle-fallback');
  const buttonLabel = submitButton.textContent;
  const requestTimeoutMillis = 10000;
  const trackingTimeoutMillis = 800;

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

  async function subscribe() {
    const requestBody = new URLSearchParams(new FormData(signupForm));
    requestBody.set('ajax', '1');
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => abortController.abort(), requestTimeoutMillis);

    const fail = (message) => {
      submitButton.disabled = false;
      submitButton.textContent = buttonLabel;
      showError(message || 'Something went wrong - please try again.');
      fallbackMessage.classList.remove('hidden');
    };

    try {
      const response = await fetch(signupForm.action, {
        method: 'POST',
        body: requestBody,
        credentials: 'omit',
        signal: abortController.signal,
      });
      // A body that is not JSON counts as a failed signup, not as a network error.
      const result = await response.json().catch(() => null);
      if (result && result.success === true) {
        trackSignupAndRedirect();
        return;
      }
      // Never inject MailerLite's own error markup, map it to our copy.
      const fieldErrors = result && result.errors && result.errors.fields;
      fail(fieldErrors && fieldErrors.email ? 'Please enter a valid email address.' : undefined);
    } catch (error) {
      fail(error.name === 'AbortError' ? undefined : 'Network error - please try again.');
    } finally {
      clearTimeout(timeoutTimer);
    }
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
