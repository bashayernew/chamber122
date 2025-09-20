// /public/js/supabase-client.js
// Single source of truth for the client. Uses CDN import for non-bundled site.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL as CONFIG_URL, SUPABASE_ANON_KEY as CONFIG_ANON_KEY } from './config.js';

const SUPABASE_URL = window.SUPABASE_URL || CONFIG_URL || import.meta?.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || CONFIG_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase-client] Missing SUPABASE_URL/ANON_KEY on window. Check your <script> env block.');
}

// Use global instance to prevent multiple GoTrueClient instances
export const supabase = window.supabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: { headers: { 'x-client-info': 'chamber122-web' } }
});

if (!window.supabase) {
  window.supabase = supabase;
}

export async function getCurrentAccountState() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return { user: null, account: null, approved: false, emailVerified: false, completeness: 0, isFullyLoggedIn: false };

    const { data: account, error: accountError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (accountError && accountError.code !== 'PGRST116') {
      console.warn('[getCurrentAccountState] account fetch error:', accountError);
    }

    const approved = account?.status === 'approved';
    const emailVerified = user?.email_confirmed_at !== null;
    const completeness = account ? Math.min(100, Math.max(0, 
      (account.name ? 20 : 0) +
      (account.description ? 20 : 0) +
      (account.category ? 15 : 0) +
      (account.phone ? 15 : 0) +
      (account.email ? 10 : 0) +
      (account.address ? 10 : 0) +
      (account.website ? 5 : 0) +
      (account.logo_url ? 5 : 0)
    )) : 0;
    
    const isFullyLoggedIn = approved && emailVerified && completeness >= 80;

    return {
      user,
      account,
      approved,
      emailVerified,
      completeness,
      isFullyLoggedIn
    };
  } catch (error) {
    console.error('[getCurrentAccountState] error:', error);
    return { user: null, account: null, approved: false, emailVerified: false, completeness: 0, isFullyLoggedIn: false };
  }
}

export async function getAccountAndCompleteness() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return { user: null, account: null, completeness: 0 };

    const { data: account, error: accountError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (accountError && accountError.code !== 'PGRST116') {
      console.warn('[getAccountAndCompleteness] account fetch error:', accountError);
    }

    const completeness = account ? Math.min(100, Math.max(0, 
      (account.name ? 20 : 0) +
      (account.description ? 20 : 0) +
      (account.category ? 15 : 0) +
      (account.phone ? 15 : 0) +
      (account.email ? 10 : 0) +
      (account.address ? 10 : 0) +
      (account.website ? 5 : 0) +
      (account.logo_url ? 5 : 0)
    )) : 0;

    return { user, account, completeness };
  } catch (error) {
    console.error('[getAccountAndCompleteness] error:', error);
    return { user: null, account: null, completeness: 0 };
  }
}
