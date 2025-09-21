import { supabase } from '/js/supabase-client.js';
import { devSignup, devLogin, isEmailConfirmationBypassed } from './auth-dev.js';
import { DEV_CONFIG } from './config-dev.js';

export async function rpcAccountExists(email, phone) {
  const { data, error } = await supabase.rpc('account_exists', { _email: email || null, _phone: phone || null });
  if (error) throw error;
  return data || { email_exists: false, phone_exists: false };
}

export async function ensureProfile({ email=null, phone=null } = {}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('No session');
  const user_id = u.user.id;

  const { data: me } = await supabase.from('profiles')
    .select('*').eq('user_id', user_id).maybeSingle();

  const payload = {
    user_id,
    email: email ?? me?.email ?? u.user.email ?? null,
    phone: phone ?? me?.phone ?? null,
  };

  if (!me) {
    const { error } = await supabase.from('profiles').insert(payload);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('profiles').update(payload).eq('user_id', user_id);
    if (error) throw error;
  }
}

export async function signupWithEmailPassword({ email, password, phone }) {
  if (!email) throw new Error('Email is required');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

  // Pre-check duplicates
  const exists = await rpcAccountExists(email, phone || null);
  if (exists.email_exists || exists.phone_exists) {
    const which = [exists.email_exists && 'email', exists.phone_exists && 'phone'].filter(Boolean).join(' & ');
    throw new Error(`An account already exists with this ${which}. Please log in.`);
  }

  // TODO: Re-enable email confirmation in production
  if (isEmailConfirmationBypassed()) {
    // Development mode - bypass email confirmation
    const result = await devSignup(email, password);
    if (result.user) {
      await ensureProfile({ email, phone: phone || null });
    }
    return result;
  }

  // Production mode - normal signup with email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // options: { data: { phone } } // optional metadata
  });
  if (error) throw error;

  if (data.session) await ensureProfile({ email, phone: phone || null });

  return { requiresConfirm: !data.session };
}

const DASHBOARD_URL = '/owner-bulletins.html';

function normEmail(e){ return (e||'').trim().toLowerCase(); }
function mapAuthError(err){
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid_grant')) return 'Email or password is incorrect.';
  if (msg.includes('not confirmed')) return 'Please confirm your email before logging in.';
  if (msg.includes('rate')) return 'Too many attempts. Try again in a few minutes.';
  return err?.message || 'Login failed. Please try again.';
}

async function signInWithTimeout({ email, password, timeoutMs = 12000 }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    return await supabase.auth.signInWithPassword({ email, password, options:{}, signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

export async function loginWithEmailPassword(email, password, { redirectTo = DASHBOARD_URL } = {}) {
  const e = normEmail(email), p = (password||'').trim();
  if (!e || !p) throw new Error('Please enter email and password.');

  // Attempt sign in (no password reset here!)
  let res;
  try {
    res = await signInWithTimeout({ email: e, password: p });
  } catch (err) {
    if (String(err).includes('timeout')) throw new Error('Login request timed out. Check your internet and try again.');
    throw err;
  }
  if (res.error) throw new Error(mapAuthError(res.error));
  if (!res.data?.session?.access_token) throw new Error('Login succeeded but no session was returned.');

  const url = new URL(redirectTo, location.origin);
  window.location.href = url.href; // hard redirect avoids SPA race conditions
}

export async function sendPasswordReset(email) {
  if (!email) throw new Error('Enter a valid email');
  email = email.toLowerCase().trim();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth.html#reset`
  });
  
  if (error) throw error;
  
  return 'If this email exists, a reset link has been sent.';
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Enter a valid email');
  email = email.toLowerCase().trim();
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email
  });
  
  if (error) throw error;
  
  return 'Confirmation email sent. Please check your inbox.';
}

export async function sendEmailMagicLink(email) {
  if (!email) throw new Error('Enter a valid email');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth-callback.html?mode=signin` }
  });
  if (error) throw error;
}

export async function sendPhoneOtp(phone) {
  if (!phone) throw new Error('Enter a valid phone');
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
  if (error) throw error;
}

export async function verifyPhoneOtp({ phone, code }) {
  if (!phone || !code) throw new Error('Phone and code required');
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (error) throw error;
  await ensureProfile({ phone });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Development function to clear session and start fresh
export async function devClearSession() {
  try {
    await supabase.auth.signOut();
    console.log('DEV: Session cleared');
  } catch (error) {
    console.error('DEV: Error clearing session:', error);
  }
}

