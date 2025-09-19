// Account Completeness Check
// This module handles checking if a user's account is complete for publishing bulletins

import { supabase } from './supabase-client.js';

/**
 * Check if user's account is complete for publishing bulletins
 * @returns {Promise<{isComplete: boolean, missingFields: string[], user: object, business: object}>}
 */
export async function checkAccountCompleteness() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        isComplete: false,
        missingFields: ['User not authenticated'],
        user: null,
        business: null
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        isComplete: false,
        missingFields: ['Profile not found'],
        user: user,
        business: null
      };
    }

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      return {
        isComplete: false,
        missingFields: ['Business profile not found'],
        user: user,
        business: null
      };
    }

    // Check completeness
    const missingFields = [];

    // Profile checks
    if (!profile.full_name || profile.full_name.trim() === '') {
      missingFields.push('Full name');
    }

    if (!profile.email_verified) {
      missingFields.push('Email verification');
    }

    if (!profile.phone || profile.phone.trim() === '') {
      missingFields.push('Phone number');
    }

    // Role check
    if (!profile.role || !['provider_individual', 'provider_company'].includes(profile.role)) {
      missingFields.push('Provider role (Become a Provider)');
    }

    // Business checks
    if (!business.business_name || business.business_name.trim() === '') {
      missingFields.push('Business name');
    }

    if (!business.sector || business.sector.trim() === '') {
      missingFields.push('Business sector/category');
    }

    if (!business.city || business.city.trim() === '') {
      missingFields.push('Business city (or "Online")');
    }

    // Logo is recommended but not required
    // if (!business.logo_url || business.logo_url.trim() === '') {
    //   missingFields.push('Business logo');
    // }

    const isComplete = missingFields.length === 0;

    return {
      isComplete,
      missingFields,
      user: user,
      business: business,
      profile: profile
    };

  } catch (error) {
    console.error('Error checking account completeness:', error);
  return {
      isComplete: false,
      missingFields: ['Error checking account'],
      user: null,
      business: null
    };
  }
}

/**
 * Show the account completeness modal
 * @param {string[]} missingFields - Array of missing field names
 * @param {Function} onComplete - Callback when user clicks "Complete Account"
 * @param {Function} onKeepEditing - Callback when user clicks "Keep Editing"
 */
export function showCompletenessModal(missingFields, onComplete, onKeepEditing) {
  // Remove existing modal if any
  const existingModal = document.getElementById('completeness-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'completeness-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content completeness-modal">
      <div class="modal-header">
        <h2><i class="fas fa-exclamation-triangle"></i> Complete Your Account</h2>
        <p>To publish bulletins, you need to complete your account setup first.</p>
      </div>
      
      <div class="modal-body">
        <div class="completeness-checklist">
          <h3>Missing Information:</h3>
          <div class="checklist-items">
            ${missingFields.map(field => `
              <div class="checklist-item missing">
                <i class="fas fa-times-circle"></i>
                <span>${field}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="completeness-note">
            <i class="fas fa-info-circle"></i>
            <p>Your bulletin has been saved as a draft. Complete your account to publish it.</p>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button id="keep-editing-btn" class="btn btn-ghost">
          <i class="fas fa-edit"></i> Keep Editing
        </button>
        <button id="complete-account-btn" class="btn btn-primary">
          <i class="fas fa-user-cog"></i> Complete Account
        </button>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('complete-account-btn').addEventListener('click', () => {
    modal.remove();
    onComplete();
  });

  document.getElementById('keep-editing-btn').addEventListener('click', () => {
    modal.remove();
    onKeepEditing();
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      onKeepEditing();
    }
  });
}

/**
 * Create a draft banner for incomplete accounts
 * @param {string} bulletinId - ID of the draft bulletin
 * @returns {HTMLElement} Banner element
 */
export function createDraftBanner(bulletinId) {
  const banner = document.createElement('div');
  banner.className = 'draft-banner incomplete';
  banner.innerHTML = `
    <div class="banner-content">
      <i class="fas fa-exclamation-triangle"></i>
      <span>Publish blocked — complete your account</span>
      <a href="/account-business.html" class="banner-link">
        Complete Account <i class="fas fa-arrow-right"></i>
      </a>
    </div>
  `;
  return banner;
}