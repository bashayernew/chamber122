// public/js/auth-login.js
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
    if (!form || !btn) { console.warn('[auth-login] Missing #login-form or #login-btn'); return; }

    console.log('[auth-login] Form found:', !!form);
    console.log('[auth-login] Button found:', !!btn);
    console.log('[auth-login] Supabase client available:', !!window._sb);

    const emailEl = form.querySelector('input[name="email"], #email, input[type="email"]');
    const passEl  = form.querySelector('input[name="password"], #password, input[type="password"]');

    const setBusy = (on) => { btn.disabled = !!on; btn.textContent = on ? 'Signing in…' : 'Log In'; };

    // optional: prefill from URL (?email=&password=&auto=1)
    try {
      const sp = new URLSearchParams(location.search);
      const qEmail = sp.get('email') || '';
      const qPass  = sp.get('password') || '';
      const auto   = sp.get('auto') === '1' || sp.get('auto') === 'true';
      if (qEmail && emailEl) emailEl.value = decodeURIComponent(qEmail);
      if (qPass && passEl)  passEl.value  = decodeURIComponent(qPass);
      if (qEmail && qPass && auto) setTimeout(() => form.requestSubmit?.() || form.submit(), 50);
    } catch {}

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = String(emailEl?.value || '').trim();
      const password = String(passEl?.value || '');

      if (!email || !password) { alert('Please enter your email and password.'); return; }

      setBusy(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { console.warn('[auth-login] signIn error', error); alert(error.message || 'Sign in failed'); setBusy(false); return; }
        console.log('[auth-login] signed in as', data.user?.email);
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