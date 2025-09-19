// Onboarding Checklist Integration
// Example integration with existing Chamber122 pages

import { supabase } from './supabase-client.js';

class OnboardingIntegration {
  constructor() {
    this.checklist = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupChecklist());
    } else {
      this.setupChecklist();
    }
  }

  setupChecklist() {
    // Check if we're on a page that should show the onboarding checklist
    if (this.shouldShowChecklist()) {
      this.createChecklistContainer();
      this.loadUserStatus();
      this.initializeChecklist();
      this.setupEventHandlers();
    }
  }

  shouldShowChecklist() {
    // Show checklist on owner pages or specific onboarding pages
    const currentPage = window.location.pathname;
    return currentPage.includes('owner') || 
           currentPage.includes('onboarding') || 
           currentPage.includes('profile');
  }

  createChecklistContainer() {
    // Create container if it doesn't exist
    let container = document.getElementById('onboarding-checklist');
    if (!container) {
      container = document.createElement('div');
      container.id = 'onboarding-checklist';
      
      // Insert after the main content or in a specific location
      const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
      if (mainContent) {
        mainContent.appendChild(container);
      }
    }
  }

  async loadUserStatus() {
    try {
      // Load user's onboarding status from Supabase
      const user = await this.getCurrentUser();
      if (!user) return;

      // Fetch user's account data
      const { data: account, error } = await this.getUserAccount(user.id);
      if (error) {
        console.error('Error loading user account:', error);
        return;
      }

      // Map account data to checklist status
      this.userStatus = this.mapAccountToChecklistStatus(account);
    } catch (error) {
      console.error('Error loading user status:', error);
      this.userStatus = this.getDefaultStatus();
    }
  }

  mapAccountToChecklistStatus(account) {
    if (!account) return this.getDefaultStatus();

    return {
      // Required items
      businessName: !!account.name,
      industryCountry: !!(account.category && account.country),
      businessLogo: !!account.logo_url,
      businessLicense: !!account.business_license,
      articlesIncorporation: !!account.articles_of_incorporation,
      signatureAuthorization: !!account.signature_authorization,
      ibanCertificate: !!account.iban_certificate,
      
      // Recommended items
      contactEmail: !!account.email,
      phoneWhatsapp: !!(account.phone || account.whatsapp),
      businessDescription: !!account.about_short,
      aboutStory: !!account.about_full,
      businessCategory: !!(account.category && account.tags && account.tags.length > 0),
      socialMediaLinks: !!(account.social && Object.keys(account.social).length > 0),
      physicalAddress: !!account.address,
      googleMapsLink: !!account.google_maps_link,
      serviceArea: !!account.service_area,
      openingHours: !!(account.business_hours && Object.keys(account.business_hours).length > 0),
      languagesSupported: !!account.languages_supported,
      numberEmployees: !!account.number_of_employees,
      coverImage: !!account.cover_url,
      galleryPortfolio: !!(account.gallery_urls && account.gallery_urls.length > 0),
      introVideo: !!account.intro_video_url,
      certificatesAwards: !!(account.certificates && account.certificates.length > 0)
    };
  }

  getDefaultStatus() {
    return {
      businessName: false,
      industryCountry: false,
      businessLogo: false,
      businessLicense: false,
      articlesIncorporation: false,
      signatureAuthorization: false,
      ibanCertificate: false,
      contactEmail: false,
      phoneWhatsapp: false,
      businessDescription: false,
      aboutStory: false,
      businessCategory: false,
      socialMediaLinks: false,
      physicalAddress: false,
      googleMapsLink: false,
      serviceArea: false,
      openingHours: false,
      languagesSupported: false,
      numberEmployees: false,
      coverImage: false,
      galleryPortfolio: false,
      introVideo: false,
      certificatesAwards: false
    };
  }

  initializeChecklist() {
    if (typeof OnboardingChecklist === 'undefined') {
      console.error('OnboardingChecklist class not found. Make sure onboarding-checklist.js is loaded.');
      return;
    }

    this.checklist = new OnboardingChecklist('onboarding-checklist', this.userStatus || this.getDefaultStatus());
  }

  setupEventHandlers() {
    if (!this.checklist) return;

    // Listen for item completion events
    document.getElementById('onboarding-checklist').addEventListener('onboardingItemComplete', (e) => {
      this.handleItemCompletion(e.detail);
    });
  }

  async handleItemCompletion(detail) {
    const { itemKey } = detail;
    
    try {
      // Show loading state
      this.showLoadingState(itemKey);
      
      // Route to appropriate page/form based on item
      const route = this.getItemRoute(itemKey);
      if (route) {
        window.location.href = route;
      } else {
        // Show a modal or form for the specific item
        this.showItemForm(itemKey);
      }
    } catch (error) {
      console.error('Error handling item completion:', error);
      this.showError('Failed to open completion form. Please try again.');
    }
  }

  getItemRoute(itemKey) {
    const routes = {
      businessName: 'owner.html#profile',
      industryCountry: 'owner.html#profile',
      businessLogo: 'owner.html#profile',
      businessLicense: 'owner.html#documents',
      articlesIncorporation: 'owner.html#documents',
      signatureAuthorization: 'owner.html#documents',
      ibanCertificate: 'owner.html#documents',
      contactEmail: 'owner.html#profile',
      phoneWhatsapp: 'owner.html#profile',
      businessDescription: 'owner.html#profile',
      aboutStory: 'owner.html#profile',
      businessCategory: 'owner.html#profile',
      socialMediaLinks: 'owner.html#profile',
      physicalAddress: 'owner.html#profile',
      googleMapsLink: 'owner.html#profile',
      serviceArea: 'owner.html#profile',
      openingHours: 'owner.html#profile',
      languagesSupported: 'owner.html#profile',
      numberEmployees: 'owner.html#profile',
      coverImage: 'owner.html#media',
      galleryPortfolio: 'owner.html#media',
      introVideo: 'owner.html#media',
      certificatesAwards: 'owner.html#documents'
    };
    
    return routes[itemKey];
  }

  showItemForm(itemKey) {
    // Create a simple modal or form for the specific item
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-white mb-4">Complete ${this.getItemDisplayName(itemKey)}</h3>
        <p class="text-gray-300 mb-4">This feature will be implemented soon. Please use the owner dashboard to complete this item.</p>
        <div class="flex space-x-3">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            Close
          </button>
          <button onclick="window.location.href='owner.html'" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  getItemDisplayName(itemKey) {
    const names = {
      businessName: 'Business Name',
      industryCountry: 'Industry & Country',
      businessLogo: 'Business Logo',
      businessLicense: 'Business License',
      articlesIncorporation: 'Articles of Incorporation',
      signatureAuthorization: 'Signature Authorization',
      ibanCertificate: 'IBAN Certificate',
      contactEmail: 'Contact Email',
      phoneWhatsapp: 'Phone/WhatsApp',
      businessDescription: 'Business Description',
      aboutStory: 'About/Story',
      businessCategory: 'Business Category',
      socialMediaLinks: 'Social Media Links',
      physicalAddress: 'Physical Address',
      googleMapsLink: 'Google Maps Link',
      serviceArea: 'Service Area',
      openingHours: 'Opening Hours',
      languagesSupported: 'Languages Supported',
      numberEmployees: 'Number of Employees',
      coverImage: 'Cover Image',
      galleryPortfolio: 'Gallery/Portfolio',
      introVideo: 'Intro Video',
      certificatesAwards: 'Certificates/Awards'
    };
    
    return names[itemKey] || itemKey;
  }

  showLoadingState(itemKey) {
    // Add loading state to the specific item
    const item = document.querySelector(`[data-item="${itemKey}"]`);
    if (item) {
      item.classList.add('loading');
    }
  }

  showError(message) {
    // Show error message
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  async getCurrentUser() {
    // Get current user from Supabase
    if (typeof supabase !== 'undefined') {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return null;
  }

  async getUserAccount(userId) {
    // Get user's account data from Supabase
    if (typeof supabase !== 'undefined') {
      return await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .single();
    }
    return { data: null, error: new Error('Supabase client not available') };
  }

  // Public methods for external use
  updateStatus(newStatus) {
    if (this.checklist) {
      this.checklist.updateStatus(newStatus);
    }
  }

  getStatus() {
    return this.checklist ? this.checklist.getStatus() : {};
  }

  refresh() {
    this.loadUserStatus().then(() => {
      if (this.checklist) {
        this.checklist.updateStatus(this.userStatus);
      }
    });
  }
}

// Initialize integration
const onboardingIntegration = new OnboardingIntegration();

// Export for global access
window.OnboardingIntegration = onboardingIntegration;
