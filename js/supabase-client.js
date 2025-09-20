import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  console.warn('[supabase-client] Missing SUPABASE_URL/ANON_KEY on window');
}

// Reuse existing client if already created (singleton)
export const supabase = (() => {
  if (window._sb) return window._sb;
  const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    global: { headers: { 'x-client-info': 'ch122-web' } }
  });
  window._sb = sb;
  return sb;
})();