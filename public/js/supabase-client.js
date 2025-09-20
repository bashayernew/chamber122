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

// Export getCurrentAccountState function
export async function getCurrentAccountState() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }
  return { user, error: null };
}

// Export getAccountAndCompleteness function
export async function getAccountAndCompleteness() {
  try {
    const { data, error } = await supabase.rpc('get_account_and_completeness');
    if (error) {
      console.error('Error in getAccountAndCompleteness:', error);
      return {
        business: null,
        completeness: { hasBusiness: false, percentage: 0 },
        next_step: 'signup'
      };
    }
    
    return data || {
      business: null,
      completeness: { hasBusiness: false, percentage: 0 },
      next_step: 'signup'
    };
  } catch (error) {
    console.error('Error in getAccountAndCompleteness:', error);
    return {
      business: null,
      completeness: { hasBusiness: false, percentage: 0 },
      next_step: 'signup'
    };
  }
}