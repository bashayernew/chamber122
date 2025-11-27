// public/js/auth-login.js (v24)
import { login } from '/js/api.js';
import { go } from '/js/nav.js';

const LOG = (...a) => console.log('[auth-login]', ...a);

// Bind once per form element
function bindLogin(form) {
  if (!form || form.dataset.bound === '1') return;
  const btn = form.querySelector('#login-btn') || form.querySelector('button[type="submit"]');
  if (!btn) { console.warn('[auth-login] missing submit button'); return; }

  // Make sure the button actually submits
  if (btn.type !== 'submit') btn.type = 'submit';

  const emailEl = form.querySelector('input[name="email"], #email, input[type="email"]');
  const passEl  = form.querySelector('input[name="password"], #password, input[type="password"]');

  const setBusy = (on) => { btn.disabled = !!on; btn.textContent = on ? 'Signing in…' : 'Log In'; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = String(emailEl?.value || '').trim();
    const password = String(passEl?.value || '');
    if (!email || !password) { alert('Please enter your email and password.'); return; }

    setBusy(true);
    try {
      LOG('Attempting login for:', email);
      const result = await login(email, password);
      LOG('Login result:', { ok: result?.ok, hasUser: !!result?.user, hasError: !!result?.error });
      
      if (!result || !result.user) {
        const errorMsg = result?.error || 'Login failed. Please check your email and password.';
        LOG('Login failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      LOG('✅ Login successful, signed in as:', result.user?.email);
      // Small delay to ensure token is stored
      await new Promise(resolve => setTimeout(resolve, 100));
      // Trigger a page refresh to update auth state
      window.location.href = '/dashboard.html';
    } catch (err) {
      console.error('[auth-login] Login error:', err);
      let errorMsg = err.message || String(err) || 'Sign in failed. Please check your email and password.';
      
      // Provide helpful guidance
      if (errorMsg.includes('not found') || errorMsg.includes('sign up')) {
        errorMsg += '\n\nWould you like to create an account instead?';
        if (confirm(errorMsg)) {
          window.location.href = '/auth.html#signup';
          return;
        }
      } else {
        alert(errorMsg);
      }
      setBusy(false);
    }
  });

  form.dataset.bound = '1';
  LOG('handler bound');
}

// Auto-fill + auto-submit if URL has creds (no auto= needed)
function maybeAutoSubmit(form) {
  try {
    const sp = new URLSearchParams(location.search);
    const qEmail = sp.get('email');
    const qPass  = sp.get('password');
    if (!qEmail || !qPass) return;

    const emailEl = form.querySelector('input[name="email"], #email, input[type="email"]');
    const passEl  = form.querySelector('input[name="password"], #password, input[type="password"]');
    if (emailEl) emailEl.value = decodeURIComponent(qEmail);
    if (passEl)  passEl.value  = decodeURIComponent(qPass);

    // give the DOM a tick, then submit
    setTimeout(() => form.requestSubmit?.() || form.submit(), 50);
    LOG('auto-submitting from URL params');
  } catch {}
}

function init() {
  LOG('script loaded; client available:', !!window._sb);

  const attach = () => {
    const form = document.querySelector('#login-form');
    if (!form) return;
    bindLogin(form);
    maybeAutoSubmit(form);
  };

  // Initial attach
  attach();

  // Re-attach if the tab switch re-renders the form
  window.addEventListener('hashchange', attach);

  // Re-attach on DOM mutations (tabs/stepper UIs often replace nodes)
  const mo = new MutationObserver(() => attach());
  mo.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', init);