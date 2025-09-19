/**
 * Button Gating Logic
 * Handles authentication gating for restricted actions
 */

import { isFullyLoggedIn } from './supabase.js';
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
    const authState = await isFullyLoggedIn();
    
    if (!authState.authed) {
      // Not authenticated - show login required modal
      return openLoginRequiredModal({
        reason: kind,
        onGuestContinue: () => {
          // Route to guest form or page with guest parameter
          const targetPage = kind === 'event' ? 'events' : 'bulletin';
          go(`${targetPage}.html?guest=1`);
        }
      });
    }
    
    if (authState.fully) {
      // Fully logged in - open modal directly on current page
      if (kind === 'event') {
        // Import and call the openEventForm function
        const { openEventForm } = await import('./events.js?v=3');
        return openEventForm();
      } else if (kind === 'bulletin') {
        // For bulletin, redirect to owner activities for now
        return go('owner-activities.html?tab=bulletins');
      }
    }
    
    // Authenticated but not fully logged in - go to profile completion
    return go('owner-activities.html?tab=profile&needs=complete');
    
  } catch (error) {
    console.error('Gating error:', error);
    alert('Error checking authentication. Please try again.');
  }
}

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
    const authState = await isFullyLoggedIn();
    
    switch (action) {
      case 'add_event':
      case 'add_bulletin':
        return {
          allowed: authState.authed,
          fullyLoggedIn: authState.fully,
          requiresAuth: !authState.authed,
          requiresCompletion: authState.authed && !authState.fully
        };
      
      case 'admin':
        return {
          allowed: authState.authed && authState.user?.app_metadata?.role === 'admin',
          requiresAuth: !authState.authed,
          requiresAdmin: authState.authed && authState.user?.app_metadata?.role !== 'admin'
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