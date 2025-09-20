// auth-persist-guard.js — ensure a single client + persistent session across pages
const PROJECT_REF = 'gidbvemmqffogakcepka';
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

(async () => {
  try {
    if (!window._sb) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.warn('[persist-guard] missing env'); return;
      }
      window._sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      });
    }
    // Warm up session from localStorage (supabase-js does this, but we verify)
    const token = localStorage.getItem(STORAGE_KEY);
    const sess = await window._sb.auth.getSession();
    console.debug('[persist-guard]', { hasToken: !!token, user: sess.data.session?.user?.email || null });

    // Cross-tab updates
    window._sb.auth.onAuthStateChange((_e, s) => {
      console.debug('[persist-guard] onAuth', s?.user?.email || null);
    });
    window.addEventListener('storage', (ev) => {
      if (ev.key?.includes(STORAGE_KEY)) location.reload();
    });
  } catch (e) {
    console.warn('[persist-guard] error', e);
  }
})();
