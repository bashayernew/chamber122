// /public/js/supabase-client.js
// Single source of truth for the client. Uses CDN import for non-bundled site.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL as CONFIG_URL, SUPABASE_ANON_KEY as CONFIG_ANON_KEY } from './config.js';

const SUPABASE_URL = window.SUPABASE_URL || CONFIG_URL || import.meta?.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || CONFIG_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing URL or ANON key on window or env.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: { headers: { 'x-client-info': 'chamber122-web' } }
});

// convenience for quick console tests:
window._sb = supabase;

// Export getCurrentAccountState function
export async function getCurrentAccountState() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }
  return { user, error: null };
}