/**
 * Supabase Client for Chamber122
 * Uses singleton client from /js/supabase-client.js
 */

// Import the singleton client
import { supabase as mainSupabase } from '/js/supabase-client.js';

// Re-export the singleton client
export const supabase = mainSupabase;

// Export configuration
export const SUPABASE_ENABLED = true;

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Logout user and redirect to specified URL
 * @param {string} redirectTo - URL to redirect to after logout
 */
export async function logoutAndRedirect(redirectTo = "/") {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }
    
    // Clear any local storage
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Redirect
    window.location.href = redirectTo;
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect even if logout fails
    window.location.href = redirectTo;
  }
}

// ============================================================================
// BUSINESS HELPERS
// ============================================================================

/**
 * Get current user's business information
 * @returns {Promise<Object>} Business data and completeness info
 */
export async function getMyBusiness() {
  try {
    const { data, error } = await supabase.rpc('get_my_business');
    
    if (error) {
      console.error('Error getting business:', error);
      return { business: null, completeness: { hasBusiness: false } };
    }
    
    const business = data?.business || null;
    const completeness = {
      hasBusiness: !!business,
      industry: !!business?.industry,
      country: !!business?.country
    };
    
    return { business, completeness };
  } catch (error) {
    console.error('Error in getMyBusiness:', error);
    return { business: null, completeness: { hasBusiness: false } };
  }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current user
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated() {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Check if user is admin
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
  try {
    const { data, error } = await supabase.rpc('is_admin', { uid: (await getCurrentUser())?.id });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

// ============================================================================
// ACTIVITIES HELPERS
// ============================================================================

/**
 * Get user's activities
 * @param {number} limit - Number of activities to fetch
 * @returns {Promise<Array>} Array of activities
 */
export async function getMyActivities(limit = 10) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        businesses:business_id (
          name,
          logo_url
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMyActivities:', error);
    return [];
  }
}

/**
 * Create a new activity
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object|null>} Created activity or null
 */
export async function createActivity(activityData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activities')
      .insert([activityData])
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createActivity:', error);
    return null;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Log initialization
console.log('Supabase client initialized:', {
  enabled: SUPABASE_ENABLED
});

// Export default client for convenience
export default supabase;