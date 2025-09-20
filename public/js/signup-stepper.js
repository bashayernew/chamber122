// public/js/signup-stepper.js
import { supabase } from '/js/supabase-client.js';

// A small, local helper just for this stepper.
// It reads the user's profile and computes a simple "completeness".
async function getAccountAndCompleteness(userId) {
  const result = { profile: null, percent: 0, missing: [] };
  if (!userId) return result;

  // Try preferred columns first; fall back to * if some columns don't exist.
  let sel = 'full_name, company, phone, avatar_url';
  let res = await supabase.from('profiles').select(sel).eq('user_id', userId).maybeSingle();

  if (res.error && (res.error.code === '42703' || (res.error.message || '').includes('column'))) {
    res = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  }
  if (res.error) {
    console.warn('[signup-stepper] profiles fetch error', res.error);
    return result;
  }

  const profile = res.data || null;
  result.profile = profile;

  // Choose some reasonable fields to measure; degrade gracefully if missing.
  const fields = ['full_name', 'company', 'phone', 'avatar_url'].filter(f => f in (profile || {}));
  if (fields.length) {
    const present = fields.filter(f => !!profile?.[f]);
    result.percent = Math.round((present.length / fields.length) * 100);
    result.missing = fields.filter(f => !profile?.[f]);
  }
  return result;
}

// Basic stepper bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) {
      // If not logged in, keep the stepper in its first state or redirect if that's your UX.
      console.log('[signup-stepper] no user; stay on step 0');
      return;
    }

    const info = await getAccountAndCompleteness(user.id);
    // TODO: wire these values into your progress bar / steps UI.
    // Example:
    const bar = document.querySelector('#signup-progress');
    if (bar) bar.style.width = `${info.percent}%`;

    console.log('[signup-stepper] completeness', info);
  } catch (e) {
    console.error('[signup-stepper] init error', e);
  }
});
