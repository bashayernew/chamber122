// Shared helpers to make sure a session is loaded/restored on every page.
import { supabase } from './supabase-client.js';

function projectRef() {
  try { return new URL(window.SUPABASE_URL).host.split('.')[0]; }
  catch { return null; }
}

function storageKey() {
  const ref = projectRef();
  return ref ? `sb-${ref}-auth-token` : null;
}

/** Ensure the Supabase client is using the latest session from localStorage.
 *  Returns the active session or null.
 */
export async function ensureSessionHydrated() {
  // quick check: does the client already have one?
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return data.session;

  // try to rehydrate from localStorage (in case client was created before storage was ready)
  try {
    const key = storageKey();
    const raw = key && localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const s = parsed?.currentSession;
      if (s?.access_token && s?.refresh_token) {
        const { data: setData, error } = await supabase.auth.setSession({
          access_token: s.access_token,
          refresh_token: s.refresh_token
        });
        if (!error) return setData.session;
        console.warn('[auth-session] setSession error', error);
      }
    }
  } catch (e) {
    console.warn('[auth-session] hydrate error', e);
  }
  return null;
}

export function onAnyAuthChange(cb) {
  // Re-render on any useful events (including INITIAL_SESSION)
  return supabase.auth.onAuthStateChange((evt, session) => {
    if (['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(evt)) {
      cb(evt, session || null);
    }
  });
}
