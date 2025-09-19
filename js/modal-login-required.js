/**
 * Login Required Modal System
 * Handles authentication gating with guest mode support
 */

import { startGuest, isGuestActive } from './guest.js';

let modalInstance = null;

/**
 * Create and inject the login required modal into the DOM
 */
function createModal() {
  if (modalInstance) return modalInstance;
  
  const modalHTML = `
    <div id="login-required" class="modal hidden" data-testid="auth-required-modal" role="dialog" aria-modal="true">
      <div class="backdrop"></div>
      <div class="panel">
        <h3 data-i18n="auth.loginRequiredTitle">Login required</h3>
        <p data-i18n="auth.loginRequiredBody">Please log in to continue. Or continue as a guest to submit for review.</p>
        <div class="guest-area hidden" id="guest-area">
          <input id="guest-email-input" data-testid="guest-email-input" type="email" placeholder="you@example.com" />
          <button id="guest-continue-btn" data-testid="guest-continue-btn" class="btn btn-primary" data-i18n="auth.continue">Continue</button>
        </div>
        <div class="actions">
          <button id="auth-continue-guest" data-testid="auth-continue-guest" class="btn btn-outline" data-i18n="auth.continueAsGuest">Continue as Guest</button>
          <a id="auth-sign-in" data-testid="auth-sign-in" class="btn btn-primary" href="auth.html#login-required" data-i18n="auth.signIn">Sign in</a>
          <button id="auth-cancel" data-testid="auth-cancel" class="btn" data-i18n="common.cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Inject modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  modalInstance = document.getElementById('login-required');
  
  setupModalEventListeners();
  
  return modalInstance;
}

/**
 * Setup event listeners for the modal
 */
function setupModalEventListeners() {
  const modal = document.getElementById('login-required');
  const guestArea = document.getElementById('guest-area');
  const guestEmailInput = document.getElementById('guest-email-input');
  const guestContinueBtn = document.getElementById('guest-continue-btn');
  const continueGuestBtn = document.getElementById('auth-continue-guest');
  const signInBtn = document.getElementById('auth-sign-in');
  const cancelBtn = document.getElementById('auth-cancel');
  const backdrop = modal?.querySelector('.backdrop');
  
  // Continue as Guest button
  continueGuestBtn?.addEventListener('click', () => {
    guestArea?.classList.remove('hidden');
    guestEmailInput?.focus();
  });
  
  // Guest continue button
  guestContinueBtn?.addEventListener('click', handleGuestContinue);
  
  // Guest email input - Enter key
  guestEmailInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleGuestContinue();
    }
  });
  
  // Cancel button
  cancelBtn?.addEventListener('click', closeLoginRequiredModal);
  
  // Backdrop click to close
  backdrop?.addEventListener('click', closeLoginRequiredModal);
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
      closeLoginRequiredModal();
    }
  });
}

/**
 * Handle guest continue action
 */
function handleGuestContinue() {
  const emailInput = document.getElementById('guest-email-input');
  const email = emailInput?.value?.trim();
  
  if (!email) {
    alert('Please enter your email address');
    return;
  }
  
  // Basic email validation (supports Arabic numerals)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  try {
    startGuest(email);
    closeLoginRequiredModal();
    
    // Call the guest continue callback if provided
    if (window._guestContinueCallback) {
      window._guestContinueCallback();
    }
  } catch (error) {
    alert('Please enter a valid email address');
  }
}

/**
 * Open the login required modal
 * @param {Object} options - Modal options
 * @param {string} options.reason - Reason for login requirement ('event'|'bulletin')
 * @param {Function} options.onGuestContinue - Callback when guest continues
 */
export function openLoginRequiredModal({ reason = 'event', onGuestContinue = null } = {}) {
  const modal = createModal();
  if (!modal) return;
  
  // Store callback for guest continue
  window._guestContinueCallback = onGuestContinue;
  
  // Update reason-specific text if needed
  const reasonText = reason === 'event' ? 'add an event' : 'post to bulletin';
  const bodyText = modal.querySelector('[data-i18n="auth.loginRequiredBody"]');
  if (bodyText) {
    bodyText.textContent = `Please log in to ${reasonText}. Or continue as a guest to submit for review.`;
  }
  
  // Show modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  // Focus management
  const firstButton = modal.querySelector('button');
  firstButton?.focus();
}

/**
 * Close the login required modal
 */
export function closeLoginRequiredModal() {
  const modal = document.getElementById('login-required');
  if (!modal) return;
  
  modal.classList.add('hidden');
  document.body.style.overflow = ''; // Restore scrolling
  
  // Reset guest area
  const guestArea = document.getElementById('guest-area');
  const guestEmailInput = document.getElementById('guest-email-input');
  if (guestArea) guestArea.classList.add('hidden');
  if (guestEmailInput) guestEmailInput.value = '';
  
  // Clear callback
  window._guestContinueCallback = null;
}

/**
 * Check if modal is currently open
 * @returns {boolean} True if modal is open
 */
export function isModalOpen() {
  const modal = document.getElementById('login-required');
  return modal && !modal.classList.contains('hidden');
}

// Initialize modal on first import
createModal();