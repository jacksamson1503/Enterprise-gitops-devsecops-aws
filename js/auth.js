/**
 * AUTH.JS — Direct Native Amazon Cognito Authentication Controller
 * Connects directly to AWS Cognito Identity Provider REST API using native fetch.
 * Zero external library dependencies, 100% reliable across all browsers.
 */

import { showToast } from './utils.js';

// ==========================================================================
// LIVE AWS COGNITO CONFIGURATION
// ==========================================================================
export const COGNITO_CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_xC96ayFV4',
  clientId: 'tnstbvuc9hbdsn4h5mtn38d7e'
};

const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
const STORAGE_KEY_USER = 'cognito_user_session_v1';
let pendingEmailForOTP = '';

export function getSessionUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveSessionUser(user) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { user } }));
}

export function clearSessionUser() {
  localStorage.removeItem(STORAGE_KEY_USER);
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } }));
}

/**
 * Helper: Call AWS Cognito Identity Provider Service directly via REST
 */
async function callCognitoAPI(targetAction, payload) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${targetAction}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || data.__type || 'Authentication failed';
    throw new Error(errorMsg);
  }
  return data;
}

/**
 * 1. SIGN UP (Register user with AWS Cognito & dispatch real OTP to email)
 */
export async function handleCognitoSignUp(name, email, password) {
  const payload = {
    ClientId: COGNITO_CONFIG.clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email }
    ]
  };

  if (name) {
    payload.UserAttributes.push({ Name: 'name', Value: name });
  }

  const result = await callCognitoAPI('SignUp', payload);
  pendingEmailForOTP = email;
  return result;
}

/**
 * 2. CONFIRM SIGN UP (Verify Email 6-digit OTP code)
 */
export async function handleCognitoConfirmOTP(email, code) {
  const payload = {
    ClientId: COGNITO_CONFIG.clientId,
    Username: email,
    ConfirmationCode: code
  };

  return await callCognitoAPI('ConfirmSignUp', payload);
}

/**
 * 3. RESEND CONFIRMATION CODE (Trigger new OTP email)
 */
export async function handleCognitoResendOTP(email) {
  const payload = {
    ClientId: COGNITO_CONFIG.clientId,
    Username: email
  };

  return await callCognitoAPI('ResendConfirmationCode', payload);
}

/**
 * 4. SIGN IN (Authenticate email + password & issue real JWT)
 */
export async function handleCognitoSignIn(email, password) {
  const payload = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_CONFIG.clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };

  const result = await callCognitoAPI('InitiateAuth', payload);
  const authResult = result.AuthenticationResult;

  const sessionUser = {
    email: email,
    name: email.split('@')[0],
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    authenticatedAt: new Date().toISOString()
  };

  saveSessionUser(sessionUser);
  return sessionUser;
}

/**
 * PAGE CONTROLLER & UI BINDINGS FOR login.html
 */
export function initAuthPage() {
  const formSignIn = document.getElementById('form-signin');
  const formSignUp = document.getElementById('form-signup');
  const formOTP = document.getElementById('form-otp');
  const tabSignIn = document.getElementById('tab-btn-signin');
  const tabSignUp = document.getElementById('tab-btn-signup');
  const signedInPanel = document.getElementById('auth-signed-in-panel');
  const authFormCard = document.getElementById('auth-form-card');
  const signOutBtn = document.getElementById('auth-signout-btn');
  const resendBtn = document.getElementById('otp-resend-btn');

  // Check if already signed in
  const currentUser = getSessionUser();
  if (currentUser) {
    if (signedInPanel) signedInPanel.style.display = 'block';
    if (authFormCard) authFormCard.style.display = 'none';
    const nameEl = document.getElementById('auth-user-display-name');
    const emailEl = document.getElementById('auth-user-display-email');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (emailEl) emailEl.textContent = currentUser.email;
  }

  // Sign out button
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      clearSessionUser();
      showToast('Signed out of Cognito session');
      window.location.reload();
    });
  }

  // Tab switching
  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener('click', () => {
      tabSignIn.classList.add('active');
      tabSignIn.style.borderBottom = '2px solid var(--color-ink)';
      tabSignIn.style.color = 'var(--color-ink)';
      tabSignUp.classList.remove('active');
      tabSignUp.style.borderBottom = '2px solid transparent';
      tabSignUp.style.color = 'var(--color-ink-muted)';
      formSignIn.style.display = 'block';
      formSignUp.style.display = 'none';
      formOTP.style.display = 'none';
    });

    tabSignUp.addEventListener('click', () => {
      tabSignUp.classList.add('active');
      tabSignUp.style.borderBottom = '2px solid var(--color-ink)';
      tabSignUp.style.color = 'var(--color-ink)';
      tabSignIn.classList.remove('active');
      tabSignIn.style.borderBottom = '2px solid transparent';
      tabSignIn.style.color = 'var(--color-ink-muted)';
      formSignUp.style.display = 'block';
      formSignIn.style.display = 'none';
      formOTP.style.display = 'none';
    });
  }

  // Handle Sign In Submit
  if (formSignIn) {
    formSignIn.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const errorEl = document.getElementById('signin-error');
      const submitBtn = document.getElementById('signin-submit-btn');

      if (!email || !password) {
        errorEl.textContent = 'Please provide both email and password.';
        return;
      }

      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying with Cognito...';

      try {
        await handleCognitoSignIn(email, password);
        showToast('Successfully signed in!');
        setTimeout(() => {
          window.location.href = 'checkout.html';
        }, 500);
      } catch (err) {
        errorEl.textContent = err.message || err.toString();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // Handle Sign Up Submit
  if (formSignUp) {
    formSignUp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const errorEl = document.getElementById('signup-error');
      const submitBtn = document.getElementById('signup-submit-btn');

      if (!name || !email || password.length < 8) {
        errorEl.textContent = 'Name, valid email, and minimum 8-character password required.';
        return;
      }

      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Calling AWS Cognito...';

      try {
        await handleCognitoSignUp(name, email, password);
        showToast('Real Cognito OTP code dispatched to email!');
        formSignUp.style.display = 'none';
        formOTP.style.display = 'block';
        const targetEmailEl = document.getElementById('otp-target-email');
        if (targetEmailEl) targetEmailEl.textContent = email;
      } catch (err) {
        errorEl.textContent = err.message || err.toString();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account & Send OTP';
      }
    });
  }

  // Handle OTP Submit
  if (formOTP) {
    formOTP.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('otp-code').value.trim();
      const errorEl = document.getElementById('otp-error');
      const submitBtn = document.getElementById('otp-submit-btn');

      if (code.length !== 6) {
        errorEl.textContent = 'Please enter the 6-digit verification code.';
        return;
      }

      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Confirming Code with AWS...';

      try {
        await handleCognitoConfirmOTP(pendingEmailForOTP, code);
        showToast('Account verified! You can now sign in.');
        formOTP.style.display = 'none';
        formSignIn.style.display = 'block';
        document.getElementById('signin-email').value = pendingEmailForOTP;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Account';
      } catch (err) {
        errorEl.textContent = err.message || err.toString();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Account';
      }
    });
  }

  // Handle Resend OTP button
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!pendingEmailForOTP) {
        showToast('No pending registration email found', 'error');
        return;
      }
      try {
        await handleCognitoResendOTP(pendingEmailForOTP);
        showToast('New verification code sent to ' + pendingEmailForOTP);
      } catch (err) {
        showToast(err.message || err.toString(), 'error');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'auth') {
      initAuthPage();
    }
  });
} else {
  if (document.body.dataset.page === 'auth') {
    initAuthPage();
  }
}
