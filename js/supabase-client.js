// public/js/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const url  = window.SUPABASE_URL;
const anon = window.SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.warn('[supabase-client] Missing SUPABASE_URL/ANON_KEY on window.');
}

if (!window.__supabase) {
  window.__supabase = createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
  )
}
export const supabase = window.__supabase