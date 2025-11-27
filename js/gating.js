/**
 * Button Gating Logic
 * Handles authentication gating for restricted actions
 */

import { getCurrentUser, getMyBusiness } from './api.js';
import { openLoginRequiredModal } from './modal-login-required.js';

/**
 * Navigate to a URL
 * @param {string} url - URL to navigate to
 */
function go(url) {
  window.location.href = url;
}

/**
 * Gate and route based on authentication status
 * @param {string} kind - Type of action ('event'|'bulletin')
 */
async function gateAndRoute(kind) {
  try {
    // Check authentication via GET /api/auth/me
    const user = await getCurrentUser();
    
    if (!user) {
      // Not authenticated - redirect to login
      window.location.href = '/auth.html#login';
      return;
    }
    
    // Check if user has a business profile
    const business = await getMyBusiness();
    
    if (!business) {
      // No business profile - alert and redirect to create one
      if (confirm('You need to create a business profile before creating events. Would you like to create one now?')) {
        window.location.href = '/owner-form.html';
      }
      return;
    }
    
    // User is authenticated and has business - open modal directly on current page
    if (kind === 'event') {
      // First try: Use global openEventForm function (should be available from events.js)
      if (typeof window.openEventForm === 'function') {
        return window.openEventForm();
      }
      // Second try: Open modal directly by ID
      const modal = document.getElementById('event-form-modal');
      if (modal) {
        modal.style.display = 'flex';
        return;
      }
      // Last resort: Try dynamic import (may fail if module not loaded)
      try {
        const eventsModule = await import('/js/events.js');
        if (eventsModule.openEventForm) {
          return eventsModule.openEventForm();
        }
      } catch (importErr) {
        console.warn('[gating] events.js not available, using direct modal access');
      }
      // Final fallback
      alert('Event form not available. Please refresh the page.');
    } else if (kind === 'bulletin') {
      // For bulletin, open bulletin form
      if (window.openBulletinForm) {
        return window.openBulletinForm();
      }
      // Fallback: redirect to owner activities
      return go('owner.html');
    }
    
  } catch (error) {
    console.error('Gating error:', error);
    alert('Error checking authentication. Please try again.');
  }
}

// Export gateAndRoute for use in other modules
export { gateAndRoute };

/**
 * Setup gating for add event button
 */
function setupAddEventGating() {
  const addEventBtn = document.getElementById('add-event-btn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', (e) => {
      e.preventDefault();
      gateAndRoute('event');
    });
  }
}

/**
 * Setup gating for add bulletin button
 */
function setupAddBulletinGating() {
  const addBulletinBtn = document.getElementById('add-bulletin-btn');
  if (addBulletinBtn) {
    addBulletinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      gateAndRoute('bulletin');
    });
  }
}

/**
 * Setup gating for floating action button (bulletin page)
 */
function setupFloatingActionGating() {
  const floatingActionBtn = document.querySelector('.floating-action .fab');
  if (floatingActionBtn) {
    floatingActionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      gateAndRoute('bulletin');
    });
  }
}

/**
 * Handle guest mode on page load
 */
function handleGuestMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const isGuestMode = urlParams.get('guest') === '1';
  
  if (isGuestMode) {
    // Auto-open guest submission form
    const kind = window.location.pathname.includes('events') ? 'event' : 'bulletin';
    openLoginRequiredModal({
      reason: kind,
      onGuestContinue: () => {
        // Guest form should open automatically
        console.log('Guest mode activated for', kind);
      }
    });
  }
}

/**
 * Initialize all gating functionality
 */
export function initGating() {
  setupAddEventGating();
  setupAddBulletinGating();
  setupFloatingActionGating();
  handleGuestMode();
}

/**
 * Check if user can perform action
 * @param {string} action - Action to check ('add_event'|'add_bulletin'|'admin')
 * @returns {Promise<Object>} Permission result
 */
export async function checkPermission(action) {
  try {
    const user = await getCurrentUser();
    const isAuthenticated = !!user;
    
    switch (action) {
      case 'add_event':
      case 'add_bulletin':
        return {
          allowed: isAuthenticated,
          fullyLoggedIn: isAuthenticated, // With normal backend, authenticated = fully logged in
          requiresAuth: !isAuthenticated,
          requiresCompletion: false
        };
      
      case 'admin':
        return {
          allowed: isAuthenticated && user?.role === 'admin',
          requiresAuth: !isAuthenticated,
          requiresAdmin: isAuthenticated && user?.role !== 'admin'
        };
      
      default:
        return { allowed: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Permission check error:', error);
    return { allowed: false, error: error.message };
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initGating);