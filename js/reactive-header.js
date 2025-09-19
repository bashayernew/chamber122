/**
 * Reactive Header Component
 * Updates navigation based on authentication state
 */

import { getCurrentUser, initAuthState } from './auth-state-manager.js';

class ReactiveHeader {
  constructor() {
    this.authCTA = document.getElementById('auth-cta');
    this.accountMenu = document.getElementById('account-menu');
    this.accountName = document.getElementById('account-name');
    this.accountEmail = document.getElementById('account-email');
    this.logoutBtn = document.getElementById('btn-logout');
    this.isInitialized = false;
  }

  // Initialize the reactive header
  init() {
    if (this.isInitialized) return;
    
    // Set up auth state listener
    authStateManager.addListener((user) => {
      this.updateUI(user);
    });

    // Set up logout handler
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    this.isInitialized = true;
    console.log('[ReactiveHeader] Initialized');
  }

  // Update UI based on authentication state
  updateUI(user) {
    if (user) {
      this.showAuthenticatedState(user);
    } else {
      this.showUnauthenticatedState();
    }
  }

  // Show authenticated state
  showAuthenticatedState(user) {
    console.log('[ReactiveHeader] Showing authenticated state for:', user.email);
    
    // Hide auth CTA
    if (this.authCTA) {
      this.authCTA.style.display = 'none';
    }

    // Show account menu
    if (this.accountMenu) {
      this.accountMenu.classList.remove('hidden');
      this.accountMenu.style.display = 'flex';
    }

    // Update account info
    if (this.accountName) {
      // Try to get display name from metadata, fallback to email
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.business_name || 
                         user.email.split('@')[0];
      this.accountName.textContent = displayName;
    }

    // Create email display if it doesn't exist
    if (!this.accountEmail && this.accountName) {
      this.accountEmail = document.createElement('span');
      this.accountEmail.className = 'text-sm text-gray-500';
      this.accountEmail.textContent = user.email;
      this.accountName.parentNode.insertBefore(this.accountEmail, this.accountName.nextSibling);
    } else if (this.accountEmail) {
      this.accountEmail.textContent = user.email;
    }

    // Check if user is admin (you can customize this logic)
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email.includes('admin') ||
                   user.email.includes('chamber122');
    
    const adminMenu = document.getElementById('menu-admin');
    if (adminMenu) {
      adminMenu.classList.toggle('hidden', !isAdmin);
    }
  }

  // Show unauthenticated state
  showUnauthenticatedState() {
    console.log('[ReactiveHeader] Showing unauthenticated state');
    
    // Show auth CTA
    if (this.authCTA) {
      this.authCTA.style.display = 'flex';
    }

    // Hide account menu
    if (this.accountMenu) {
      this.accountMenu.classList.add('hidden');
      this.accountMenu.style.display = 'none';
    }
  }

  // Handle logout
  async handleLogout() {
    try {
      console.log('[ReactiveHeader] Logging out user');
      await authStateManager.signOut();
      
      // Redirect to home page
      window.location.href = 'index.html';
    } catch (error) {
      console.error('[ReactiveHeader] Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure auth state manager is initialized
  setTimeout(() => {
    const reactiveHeader = new ReactiveHeader();
    reactiveHeader.init();
  }, 200);
});

export default ReactiveHeader;
