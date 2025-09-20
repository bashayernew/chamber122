import { supabase } from '/js/supabase-client.js';

console.log('[auth-login] Script loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('[auth-login] DOM ready, setting up login handler');
  const form = document.querySelector('#loginEmailForm');
  const btn  = document.querySelector('#login-submit');
  if (!form || !btn) {
    console.warn('[auth-login] Missing #loginEmailForm or #login-submit');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true; btn.textContent = 'Signing in…';
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('[auth-login] signIn error', error);
        alert(error.message || 'Sign in failed');
        btn.disabled = false; btn.textContent = 'Sign In';
        return;
      }
      console.log('[auth-login] signed in as', data.user?.email);
      location.href = '/dashboard.html';
    } catch (err) {
      console.warn('[auth-login] exception', err);
      alert(String(err));
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });

  console.log('[auth-login] Login handler setup complete');
});
