/**
 * Header Authentication State Management
 * Handles switching between auth CTAs and account menu based on login state
 */

import { getUser, onAuthStateChange, isAdmin, getMyBusiness } from './supabase.js';
import { supabase } from './supabase-client.js';

let currentUser = null;
let currentBusiness = null;

/**
 * Initialize header authentication system
 */
export function initHeaderAuth() {
  // Load initial state
  updateHeaderState();
  
  // Listen for auth state changes
  onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateHeaderState();
  });
}

/**
 * Update header state based on current authentication
 */
async function updateHeaderState() {
  const authCta = document.getElementById('auth-cta');
  const accountMenu = document.getElementById('account-menu');
  
  if (!authCta || !accountMenu) {
    console.warn('Header auth elements not found');
    return;
  }
  
  if (!currentUser) {
    // Not logged in - show auth CTAs, hide account menu
    authCta.classList.remove('hidden');
    accountMenu.classList.add('hidden');
  } else {
    // Logged in - hide auth CTAs, show account menu
    authCta.classList.add('hidden');
    accountMenu.classList.remove('hidden');
    
    // Update business info
    await updateBusinessInfo();
  }
}

/**
 * Update business information in the header
 */
async function updateBusinessInfo() {
  const accountName = document.getElementById('account-name');
  const accountAvatar = document.getElementById('account-avatar');
  const adminLink = document.getElementById('menu-admin');
  
  if (!currentUser) return;
  
  // Get business data
  currentBusiness = await getMyBusiness().catch(() => null);
  
  // Update account name
  if (accountName) {
    const displayName = currentBusiness?.name || 
                       currentUser.user_metadata?.full_name || 
                       currentUser.email?.split('@')[0] || 
                       'Account';
    accountName.textContent = displayName;
  }
  
  // Update avatar
  if (accountAvatar && currentBusiness?.logo_url) {
    accountAvatar.src = currentBusiness.logo_url;
    accountAvatar.alt = `${currentBusiness.name || 'Account'} logo`;
    accountAvatar.classList.remove('hidden');
  } else if (accountAvatar) {
    accountAvatar.classList.add('hidden');
  }
  
  // Show/hide admin link
  if (adminLink) {
    const isUserAdmin = await isAdmin(currentUser);
    if (isUserAdmin) {
      adminLink.classList.remove('hidden');
    } else {
      adminLink.classList.add('hidden');
    }
  }
}

/**
 * Setup account menu interactions
 */
export function setupAccountMenu() {
  const accountBtn = document.getElementById('account-btn');
  const accountDropdown = document.getElementById('account-dropdown');
  const logoutBtn = document.getElementById('btn-logout');
  
  if (!accountBtn || !accountDropdown) return;
  
  // Toggle dropdown
  accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accountDropdown.classList.toggle('hidden');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!accountBtn.contains(e.target) && !accountDropdown.contains(e.target)) {
      accountDropdown.classList.add('hidden');
    }
  });
  
  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  }
}

/**
 * Handle user logout
 */
async function handleLogout() {
  try {
    await supabase.auth.signOut();
    
    // Clear local state
    currentUser = null;
    currentBusiness = null;
    
    // Redirect to home page
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error logging out. Please try again.');
  }
}

/**
 * Get current user info
 * @returns {Object} Current user and business data
 */
export function getCurrentUserInfo() {
  return {
    user: currentUser,
    business: currentBusiness
  };
}

/**
 * Force refresh of header state
 */
export function refreshHeaderState() {
  updateHeaderState();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initHeaderAuth();
  setupAccountMenu();
});