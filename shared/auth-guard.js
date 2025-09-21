import { supabase } from '../js/supabase-client.js';

export async function requireAuth(redirect = '/auth.html#login') {
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL(redirect, location.origin);
    window.location.href = url.href;
    throw new Error('Not authenticated');
  }
  // finish post-signup if needed
  try {
    const { finalizePostLogin } = await import('/js/signup-with-documents.js');
    const pending = localStorage.getItem('pendingSignup');
    if (pending && finalizePostLogin) {
      await finalizePostLogin(JSON.parse(pending));
    }
  } catch { /* optional */ }
  return user;
}
