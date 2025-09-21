// Compliance Guards
// Prevents unauthorized actions based on compliance status

import { supabase } from './supabase-client.js';

class ComplianceGuards {
  constructor() {
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
    this.setupGuards();
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

      this.complianceStatus = {
        business_id: business.id,
        status: verification?.status || 'pending',
        is_active: business.is_active,
        notes: verification?.notes,
        reasons: verification?.reasons
      };
    } catch (error) {
      console.error('Error loading compliance status:', error);
    }
  }

  setupGuards() {
    // Guard event creation
    this.guardEventCreation();
    
    // Guard bulletin creation
    this.guardBulletinCreation();
    
    // Guard other sensitive actions
    this.guardSensitiveActions();
  }

  guardEventCreation() {
    // Find event creation buttons/links
    const eventButtons = document.querySelectorAll('[href*="event"], [data-action="create-event"], .create-event-btn, #create-event');
    
    eventButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        if (!this.canCreateContent()) {
          e.preventDefault();
          this.showComplianceModal('event');
        }
      });
    });

    // Guard event form submissions
    const eventForms = document.querySelectorAll('form[action*="event"], form[data-type="event"]');
    eventForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.canCreateContent()) {
          e.preventDefault();
          this.showComplianceModal('event');
        }
      });
    });
  }

  guardBulletinCreation() {
    // Find bulletin creation buttons/links
    const bulletinButtons = document.querySelectorAll('[href*="bulletin"], [data-action="create-bulletin"], .create-bulletin-btn, #create-bulletin');
    
    bulletinButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        if (!this.canCreateContent()) {
          e.preventDefault();
          this.showComplianceModal('bulletin');
        }
      });
    });

    // Guard bulletin form submissions
    const bulletinForms = document.querySelectorAll('form[action*="bulletin"], form[data-type="bulletin"]');
    bulletinForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.canCreateContent()) {
          e.preventDefault();
          this.showComplianceModal('bulletin');
        }
      });
    });
  }

  guardSensitiveActions() {
    // Guard other sensitive actions that require compliance
    const sensitiveActions = document.querySelectorAll('[data-requires-compliance]');
    
    sensitiveActions.forEach(element => {
      element.addEventListener('click', (e) => {
        if (!this.canCreateContent()) {
          e.preventDefault();
          this.showComplianceModal('action');
        }
      });
    });
  }

  canCreateContent() {
    if (!this.complianceStatus) {
      // No compliance status means user needs to complete profile
      return false;
    }

    const { status, is_active } = this.complianceStatus;

    // Allow if approved and active
    if (status === 'approved' && is_active) {
      return true;
    }

    // Allow if pending or changes requested (but show banner)
    if ((status === 'pending' || status === 'changes_requested') && is_active) {
      return true;
    }

    // Block if rejected or deactivated
    return false;
  }

  showComplianceModal(contentType) {
    const modal = this.createComplianceModal(contentType);
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  createComplianceModal(contentType) {
    const modal = document.createElement('div');
    modal.className = 'compliance-modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const contentTypes = {
      event: {
        title: 'Event Creation Restricted | إنشاء الأحداث مقيد',
        message: 'You need to complete your compliance verification before creating events.',
        messageAr: 'تحتاج إلى إكمال التحقق من الامتثال قبل إنشاء الأحداث.'
      },
      bulletin: {
        title: 'Bulletin Creation Restricted | إنشاء النشرات مقيد',
        message: 'You need to complete your compliance verification before creating bulletins.',
        messageAr: 'تحتاج إلى إكمال التحقق من الامتثال قبل إنشاء النشرات.'
      },
      action: {
        title: 'Action Restricted | الإجراء مقيد',
        message: 'You need to complete your compliance verification before performing this action.',
        messageAr: 'تحتاج إلى إكمال التحقق من الامتثال قبل تنفيذ هذا الإجراء.'
      }
    };

    const typeInfo = contentTypes[contentType] || contentTypes.action;
    const status = this.complianceStatus?.status || 'pending';

    modal.innerHTML = `
      <div class="compliance-modal-content" style="
        background: rgba(31, 41, 55, 0.95);
        border: 1px solid rgba(75, 85, 99, 0.3);
        border-radius: 12px;
        max-width: 500px;
        width: 100%;
        padding: 2rem;
        text-align: center;
        backdrop-filter: blur(20px);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      ">
        <div class="modal-icon" style="font-size: 3rem; margin-bottom: 1rem;">
          ${this.getStatusIcon(status)}
        </div>
        
        <h3 style="color: white; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
          ${typeInfo.title}
        </h3>
        
        <p style="color: #d1d5db; margin-bottom: 1rem; line-height: 1.6;">
          ${typeInfo.message}
        </p>
        
        <p style="color: #9ca3af; margin-bottom: 2rem; font-size: 0.9rem;">
          ${typeInfo.messageAr}
        </p>
        
        ${this.getStatusMessage(status)}
        
        <div class="modal-actions" style="
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        ">
          <button class="btn btn-secondary modal-close" style="
            background: rgba(107, 114, 128, 0.2);
            border: 1px solid rgba(107, 114, 128, 0.3);
            color: #d1d5db;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            Close | إغلاق
          </button>
          <button class="btn btn-primary go-to-compliance" style="
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border: none;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            Complete Verification | إكمال التحقق
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal(modal);
    });

    modal.querySelector('.go-to-compliance').addEventListener('click', () => {
      window.location.href = 'compliance.html';
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  getStatusIcon(status) {
    const icons = {
      pending: '⏳',
      changes_requested: '🔄',
      rejected: '❌',
      deactivated: '🚫',
      approved: '✅'
    };
    return icons[status] || '📋';
  }

  getStatusMessage(status) {
    const messages = {
      pending: `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #f59e0b; margin: 0; font-weight: 500;">
            Your documents are under review. You can still use the app while waiting.
          </p>
          <p style="color: #d97706; margin: 0; font-size: 0.9rem;">
            مستنداتك قيد المراجعة. يمكنك استخدام التطبيق أثناء الانتظار.
          </p>
        </div>
      `,
      changes_requested: `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #3b82f6; margin: 0; font-weight: 500;">
            Please review the requested changes and update your documents.
          </p>
          <p style="color: #1d4ed8; margin: 0; font-size: 0.9rem;">
            يرجى مراجعة التغييرات المطلوبة وتحديث مستنداتك.
          </p>
        </div>
      `,
      rejected: `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #ef4444; margin: 0; font-weight: 500;">
            Your submission was rejected. Please review and resubmit.
          </p>
          <p style="color: #dc2626; margin: 0; font-size: 0.9rem;">
            تم رفض طلبك. يرجى المراجعة وإعادة الإرسال.
          </p>
        </div>
      `,
      deactivated: `
        <div style="background: rgba(107, 114, 128, 0.1); border: 1px solid rgba(107, 114, 128, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #6b7280; margin: 0; font-weight: 500;">
            Your account has been deactivated. Please contact support.
          </p>
          <p style="color: #4b5563; margin: 0; font-size: 0.9rem;">
            تم تعطيل حسابك. يرجى الاتصال بالدعم.
          </p>
        </div>
      `
    };
    return messages[status] || '';
  }

  closeModal(modal) {
    modal.classList.remove('show');
    modal.querySelector('.compliance-modal-content').style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      modal.remove();
    }, 300);
  }

  // Public method to refresh compliance status
  async refresh() {
    await this.loadComplianceStatus();
    this.setupGuards();
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }
}

// Initialize compliance guards
let complianceGuards = null;

document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other scripts are loaded
  setTimeout(() => {
    complianceGuards = new ComplianceGuards();
  }, 300);
});

// Export for global access
window.ComplianceGuards = ComplianceGuards;
window.complianceGuards = complianceGuards;
