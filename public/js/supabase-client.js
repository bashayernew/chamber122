// public/js/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const url  = window.SUPABASE_URL;
const anon = window.SUPABASE_ANON_KEY;
if (!url || !anon) console.warn('[supabase-client] Missing SUPABASE_URL/ANON_KEY on window.');

export const supabase = window._sb || createClient(url, anon, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  global: { headers: { 'x-client-info': 'chamber122-web' } }
});

window._sb = supabase;

// Debug session persistence
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[supabase-client] auth state change:', { event, hasSession: !!session, email: session?.user?.email });
});

// Check session on load
supabase.auth.getSession().then(({ data }) => {
  console.log('[supabase-client] initial session check:', { hasSession: !!data.session, email: data.session?.user?.email });
});