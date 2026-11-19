/**
 * AUTH.JS — Amazon Cognito Authentication Controller
 * Manages User Pool signup, email OTP confirmation code,
 * user login (JWT issuance), and session storage.
 */

import { showToast } from './utils.js';

// ==========================================================================
// AWS COGNITO CONFIGURATION
// Replace these with your real Cognito User Pool & App Client IDs from AWS Console
// ==========================================================================
export const COGNITO_CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_SAMPLEPOOL',   // Replace with your real User Pool ID
  clientId: 'SAMPLECLIENTID123456789'   // Replace with your real App Client ID
};

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
 * 1. SIGN UP (Register user with Cognito & dispatch OTP to email)
 */
export async function handleCognitoSignUp(name, email, password) {
  // If real Amazon Cognito Identity SDK is available and configured
  if (typeof AmazonCognitoIdentity !== 'undefined' && COGNITO_CONFIG.userPoolId !== 'us-east-1_SAMPLEPOOL') {
    const poolData = {
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const attributeList = [
      new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
      new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'name', Value: name })
    ];

    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          reject(err.message || JSON.stringify(err));
          return;
        }
        pendingEmailForOTP = email;
        resolve({ success: true, user: result.user });
      });
    });
  } else {
    // Demonstration / Simulated flow while user sets up their Cognito Console
    pendingEmailForOTP = email;
    sessionStorage.setItem('temp_cognito_user', JSON.stringify({ name, email, password }));
    return { success: true, message: 'OTP dispatched to email' };
  }
}

/**
 * 2. CONFIRM SIGN UP (Verify Email OTP code)
 */
export async function handleCognitoConfirmOTP(email, code) {
  if (typeof AmazonCognitoIdentity !== 'undefined' && COGNITO_CONFIG.userPoolId !== 'us-east-1_SAMPLEPOOL') {
    const poolData = {
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const userData = { Username: email, Pool: userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err.message || JSON.stringify(err));
          return;
        }
        resolve({ success: true, result });
      });
    });
  } else {
    // Simulated confirmation
    if (code && code.length === 6) {
      return { success: true };
    } else {
      throw new Error('Please enter a valid 6-digit code');
    }
  }
}

/**
 * 3. SIGN IN (Authenticate email + password)
 */
export async function handleCognitoSignIn(email, password) {
  if (typeof AmazonCognitoIdentity !== 'undefined' && COGNITO_CONFIG.userPoolId !== 'us-east-1_SAMPLEPOOL') {
    const poolData = {
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password
    });
    const userData = { Username: email, Pool: userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          const idToken = result.getIdToken().getJwtToken();
          const sessionUser = {
            email: email,
            name: result.getIdToken().payload.name || email.split('@')[0],
            token: idToken,
            authenticatedAt: new Date().toISOString()
          };
          saveSessionUser(sessionUser);
          resolve(sessionUser);
        },
        onFailure: (err) => {
          reject(err.message || 'Invalid email or password');
        }
      });
    });
  } else {
    // Simulated sign-in
    const temp = JSON.parse(sessionStorage.getItem('temp_cognito_user') || '{}');
    const name = temp.name || email.split('@')[0];
    const sessionUser = {
      email,
      name,
      token: 'jwt-simulated-cognito-token-' + Date.now(),
      authenticatedAt: new Date().toISOString()
    };
    saveSessionUser(sessionUser);
    return sessionUser;
  }
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
        errorEl.textContent = err.toString();
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
      submitBtn.textContent = 'Creating Cognito Identity...';

      try {
        await handleCognitoSignUp(name, email, password);
        showToast('Verification OTP code sent!');
        formSignUp.style.display = 'none';
        formOTP.style.display = 'block';
        const targetEmailEl = document.getElementById('otp-target-email');
        if (targetEmailEl) targetEmailEl.textContent = email;
      } catch (err) {
        errorEl.textContent = err.toString();
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
      submitBtn.textContent = 'Confirming Code...';

      try {
        await handleCognitoConfirmOTP(pendingEmailForOTP, code);
        showToast('Email verified! You may now sign in.');
        formOTP.style.display = 'none';
        formSignIn.style.display = 'block';
        document.getElementById('signin-email').value = pendingEmailForOTP;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Account';
      } catch (err) {
        errorEl.textContent = err.toString();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Account';
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
