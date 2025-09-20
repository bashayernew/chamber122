// Import from supabase-client and re-export
import { supabase } from './supabase-client.js';

// Local implementation of getCurrentAccountState
async function getCurrentAccountState() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return { user: null, business: null, completeness: { hasBusiness: false } };

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    return {
      user,
      business,
      completeness: {
        hasBusiness: !!business,
        percentage: business ? 100 : 0
      }
    };
  } catch (error) {
    console.error('Error getting current account state:', error);
    return { user: null, business: null, completeness: { hasBusiness: false } };
  }
}

// Re-export the main exports
export { supabase, getCurrentAccountState };

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function isAdmin() {
  // Simple admin check - you can customize this logic
  const user = await getUser();
  return user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');
}

export async function getMyBusiness() {
  // Get business for current user
  const user = await getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', user.id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found - user doesn't have a business yet
      return null;
    }
    console.error('Error fetching business:', error);
    throw error;
  }
  return data;
}

export async function requireAuth(redirectTo = '/auth.html') {
  const user = await getUser();
  if (!user) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Export supabase as 'sb' function for backward compatibility
export const sb = () => supabase;

// Additional exports that other files expect
export async function isAuthenticated() {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function isFullyLoggedIn() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check if user has a complete profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
    
  return !!profile;
}