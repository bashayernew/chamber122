// public/js/auth-login.js - Using localStorage only (no backend, no API)
import { login } from '/js/auth-localstorage.js';

console.log('[auth-login] script loaded');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const btn = document.getElementById('login-btn');
  const status = document.getElementById('login-status');

  const url = new URL(location.href);
  const redirect = url.searchParams.get('redirect') || '/owner.html';

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) status.textContent = 'Signing in…';
      if (btn) btn.disabled = true;

      try {
        const result = login(
          (email && email.value ? email.value.trim() : ''),
          password && password.value ? password.value : ''
        );

        if (status) status.textContent = 'Success. Redirecting…';
        
        // Dispatch auth-changed event for header update
        window.dispatchEvent(new CustomEvent('auth-changed'));
        
        location.replace(redirect);
      } catch (error) {
        if (status) status.textContent = error.message || 'Login failed';
        if (btn) btn.disabled = false;
      }
    });
  }
});
