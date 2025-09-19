/**
 * Supabase Client for Chamber122
 * Standalone ES module for Supabase integration
 * Reads configuration from meta tags and provides helper functions
 */

// Export configuration first
export const SUPABASE_ENABLED = true;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Read configuration from meta tags
function getMetaContent(name) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta ? meta.getAttribute('content') : null;
}

const SUPABASE_URL = getMetaContent('supabase-url') || 'https://gidbvemmqffogakcepka.supabase.co';
const SUPABASE_ANON_KEY = getMetaContent('supabase-anon-key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

// Create and export Supabase client
export const supabase = window.supabase ?? (window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: { 
    headers: { 'x-application-name': 'web' } 
  }
}));

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

/**
 * Get account and completeness information
 * @returns {Promise<Object>} Account data, completeness, and next step
 */
export async function getAccountAndCompleteness() {
  try {
    const { data, error } = await supabase.rpc('get_account_and_completeness');
    
    if (error) {
      console.error('Error getting account completeness:', error);
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
  url: SUPABASE_URL,
  enabled: SUPABASE_ENABLED
});

// Export default client for convenience
export default supabase;
