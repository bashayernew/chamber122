import { supabase } from '/js/supabase-client.js';

if (window.__authLoginBound) {
  console.log('[auth-login] already bound; skipping');
} else {
  window.__authLoginBound = true;
  console.log('[auth-login] Script loaded');

  document.addEventListener('DOMContentLoaded', () => {
    console.log('[auth-login] DOM ready, setting up login handler');

    const form = document.querySelector('#login-form');
    const btn  = document.querySelector('#login-btn');

    console.log('[auth-login] Form found:', !!form);
    console.log('[auth-login] Button found:', !!btn);
    console.log('[auth-login] Supabase client available:', !!window._sb);

    if (!form || !btn) {
      console.warn('[auth-login] Missing #login-form or #login-btn');
      console.warn('[auth-login] Available forms:', document.querySelectorAll('form'));
      console.warn('[auth-login] Available buttons:', document.querySelectorAll('button'));
      return;
    }

    const pick = (root, selectors) => {
      for (const s of selectors) {
        const el = root.querySelector(s);
        if (el) return el;
      }
      return null;
    };

    const emailEl = pick(form, ['input[name="email"]', '#email', 'input[type="email"]']);
    const passEl  = pick(form, ['input[name="password"]', '#password', 'input[type="password"]']);

    if (!emailEl || !passEl) {
      console.warn('[auth-login] Email/Password inputs not found in form');
      return;
    }

    const setBusy = (on) => {
      if (!btn) return;
      btn.disabled = !!on;
      btn.textContent = on ? 'Signing in…' : 'Log In';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('[auth-login] Form submit event triggered!');
      
      const email = String(emailEl.value || '').trim();
      const password = String(passEl.value || '');

      console.log('[auth-login] Email:', email);
      console.log('[auth-login] Password length:', password.length);
      console.log('[auth-login] Supabase client:', !!supabase);

      if (!email || !password) {
        console.warn('[auth-login] Missing email or password');
        alert('Please enter your email and password.');
        return;
      }

      setBusy(true);
      console.log('[auth-login] Starting login process...');
      
      try {
        console.log('[auth-login] Calling supabase.auth.signInWithPassword...');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          console.warn('[auth-login] signIn error', error);
          alert(error.message || 'Sign in failed');
          setBusy(false);
          return;
        }
        console.log('[auth-login] signed in as', data.user?.email);
        alert('Login successful! Redirecting...');
        location.href = '/dashboard.html';
      } catch (err) {
        console.warn('[auth-login] exception', err);
        alert(String(err));
        setBusy(false);
      }
    });

    console.log('[auth-login] Login handler setup complete');
  });
}