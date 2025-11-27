// Global Compliance Status Banner
// Shows compliance status across all pages
// Updated to use backend API instead of Supabase

// Compliance banner disabled for now - can be re-enabled with backend API if needed

class ComplianceBanner {
  constructor() {
    this.banner = null;
    this.complianceStatus = null;
    this.init();
  }

  async init() {
    // Wait for Supabase to be ready
    if (typeof supabase === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }

    await this.loadComplianceStatus();
    this.createBanner();
    this.setupEventListeners();
    this.updateBanner();
  }

  async loadComplianceStatus() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Get business data
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error('Error loading business:', businessError);
        return;
      }

      if (!business) return;

      // Get latest verification status
      const { data: verification, error: verificationError } = await supabase
        .from('v_business_verification_latest')
        .select('*')
        .eq('business_id', business.id)
        .maybeSingle();

      if (verification) {
        this.complianceStatus = {
          ...verification,
          business_id: business.id,
          is_active: business.is_active
        };
      } else {
        // No verification record means pending
        this.complianceStatus = {
          business_id: business.id,
          status: 'pending',
          is_active: business.is_active
        };
      }
    } catch (error) {
      console.error('Error loading compliance status:', error);
    }
  }

  createBanner() {
    // Check if banner already exists
    if (document.getElementById('global-compliance-banner')) return;

    this.banner = document.createElement('div');
    this.banner.id = 'global-compliance-banner';
    this.banner.className = 'global-compliance-banner';
    this.banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 1rem;
      color: white;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;

    this.banner.innerHTML = `
      <div class="banner-content" style="
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      ">
        <div class="banner-icon" style="font-size: 1.5rem;">📋</div>
        <div class="banner-text" style="flex: 1;">
          <div class="banner-title" style="font-weight: 600; margin-bottom: 0.25rem;"></div>
          <div class="banner-subtitle" style="font-size: 0.9rem; opacity: 0.9;"></div>
        </div>
        <button class="banner-action btn btn-primary" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        ">Update Now</button>
        <button class="banner-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        ">×</button>
      </div>
    `;

    // Insert after header or at the beginning of body
    const header = document.querySelector('header');
    if (header) {
      header.insertAdjacentElement('afterend', this.banner);
    } else {
      document.body.insertBefore(this.banner, document.body.firstChild);
    }
  }

  setupEventListeners() {
    if (!this.banner) return;

    // Action button
    const actionBtn = this.banner.querySelector('.banner-action');
    actionBtn?.addEventListener('click', () => {
      window.location.href = 'compliance.html';
    });

    // Close button
    const closeBtn = this.banner.querySelector('.banner-close');
    closeBtn?.addEventListener('click', () => {
      this.hideBanner();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.banner?.style.transform === 'translateY(0px)') {
        this.hideBanner();
      }
    });
  }

  updateBanner() {
    if (!this.banner || !this.complianceStatus) {
      this.hideBanner();
      return;
    }

    const status = this.complianceStatus.status;
    const isActive = this.complianceStatus.is_active;

    // Don't show banner for approved and active businesses
    if (status === 'approved' && isActive) {
      this.hideBanner();
      return;
    }

    const title = this.banner.querySelector('.banner-title');
    const subtitle = this.banner.querySelector('.banner-subtitle');
    const action = this.banner.querySelector('.banner-action');

    // Reset classes
    this.banner.className = 'global-compliance-banner';

    switch (status) {
      case 'pending':
        this.banner.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        title.textContent = 'Under Review | قيد المراجعة';
        subtitle.textContent = 'Your documents are being reviewed by our team.';
        action.textContent = 'Update Documents | تحديث المستندات';
        break;
        
      case 'changes_requested':
        this.banner.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        title.textContent = 'Changes Requested | طلب تعديلات';
        subtitle.textContent = 'Please review the requested changes and update your documents.';
        action.textContent = 'Update Now | تحديث الآن';
        break;
        
      case 'rejected':
        this.banner.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        title.textContent = 'Rejected | مرفوض';
        subtitle.textContent = 'Your submission was rejected. Please review and resubmit.';
        action.textContent = 'Resubmit | إعادة إرسال';
        break;
        
      case 'deactivated':
        this.banner.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
        title.textContent = 'Deactivated | معطل';
        subtitle.textContent = 'Your account has been deactivated. Please contact support.';
        action.textContent = 'Contact Support | اتصل بالدعم';
        break;
        
      default:
        // Default to pending if no status
        this.banner.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        title.textContent = 'Complete Your Profile | أكمل ملفك الشخصي';
        subtitle.textContent = 'Please complete your business information and upload required documents.';
        action.textContent = 'Get Started | ابدأ الآن';
    }

    this.showBanner();
  }

  showBanner() {
    if (this.banner) {
      this.banner.style.transform = 'translateY(0)';
    }
  }

  hideBanner() {
    if (this.banner) {
      this.banner.style.transform = 'translateY(-100%)';
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }

  // Public method to refresh status
  async refresh() {
    await this.loadComplianceStatus();
    this.updateBanner();
  }
}

// Initialize global compliance banner
let globalComplianceBanner = null;

document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other scripts are loaded
  setTimeout(() => {
    globalComplianceBanner = new ComplianceBanner();
  }, 200);
});

// Export for global access
window.ComplianceBanner = ComplianceBanner;
window.globalComplianceBanner = globalComplianceBanner;
