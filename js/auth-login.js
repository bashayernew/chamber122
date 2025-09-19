// /public/js/auth-login.js
import { loginWithEmailPassword } from './auth-actions.js';

const form = document.getElementById('loginEmailForm');
const btn  = document.getElementById('login-submit');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await loginWithEmailPassword(email, password);

    // Guard: if email confirmation is required and session isn't present
    if (!res?.session && !res?.user) {
      throw new Error('No session returned (email confirmation may be required).');
    }

    window.location.href = '/dashboard.html';
  } catch (err) {
    alert(err?.message || 'Login failed');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});