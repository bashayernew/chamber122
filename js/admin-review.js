// Admin Review Dashboard JavaScript
// Handles business compliance review and management

import { supabase } from './supabase-client.js';

class AdminReviewManager {
  constructor() {
    this.businesses = [];
    this.filteredBusinesses = [];
    this.currentBusiness = null;
    this.init();
  }

  async init() {
    // Check if user is admin
    if (!(await this.isAdmin())) {
      this.showError('Access denied. Admin privileges required.');
      window.location.href = 'index.html';
      return;
    }

    this.setupEventListeners();
    await this.loadBusinesses();
    this.updateStats();
    this.renderTable();
  }

  setupEventListeners() {
    // Filters
    document.getElementById('status-filter')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('search-filter')?.addEventListener('input', () => this.applyFilters());
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadBusinesses());

    // Review modal
    document.getElementById('close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('cancel-review')?.addEventListener('click', () => this.closeModal());
    
    // Review form
    document.getElementById('review-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitReview();
    });

    // Decision change handler
    document.querySelectorAll('input[name="decision"]').forEach(radio => {
      radio.addEventListener('change', () => this.handleDecisionChange());
    });

    // Close modal on overlay click
    document.getElementById('review-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'review-modal') {
        this.closeModal();
      }
    });
  }

  async isAdmin() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      return !error && data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async loadBusinesses() {
    try {
      this.showLoading(true);
      
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`
          *,
          profiles!inner(*),
          business_verifications!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.businesses = businesses || [];
      this.filteredBusinesses = [...this.businesses];
      this.updateStats();
      this.renderTable();
      
    } catch (error) {
      console.error('Error loading businesses:', error);
      this.showError('Failed to load businesses. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }

  updateStats() {
    const stats = {
      pending: 0,
      approved: 0,
      changes_requested: 0,
      rejected: 0
    };

    this.businesses.forEach(business => {
      const verification = business.business_verifications?.[0];
      const status = verification?.status || 'pending';
      stats[status] = (stats[status] || 0) + 1;
    });

    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('approved-count').textContent = stats.approved;
    document.getElementById('changes-requested-count').textContent = stats.changes_requested;
    document.getElementById('rejected-count').textContent = stats.rejected;
  }

  applyFilters() {
    const statusFilter = document.getElementById('status-filter').value;
    const searchFilter = document.getElementById('search-filter').value.toLowerCase();

    this.filteredBusinesses = this.businesses.filter(business => {
      const verification = business.business_verifications?.[0];
      const status = verification?.status || 'pending';
      
      const statusMatch = !statusFilter || status === statusFilter;
      const searchMatch = !searchFilter || 
        business.name.toLowerCase().includes(searchFilter) ||
        business.profiles?.contact_email?.toLowerCase().includes(searchFilter);

      return statusMatch && searchMatch;
    });

    this.renderTable();
  }

  renderTable() {
    const tbody = document.getElementById('businesses-tbody');
    if (!tbody) return;

    if (this.filteredBusinesses.length === 0) {
      this.showEmptyState(true);
      tbody.innerHTML = '';
      return;
    }

    this.showEmptyState(false);
    
    tbody.innerHTML = this.filteredBusinesses.map(business => {
      const verification = business.business_verifications?.[0];
      const status = verification?.status || 'pending';
      const profile = business.profiles || {};
      
      return `
        <tr>
          <td>
            <div class="business-info">
              <div class="business-name">${business.name || 'N/A'}</div>
              <div class="business-email">${profile.contact_email || 'No email'}</div>
            </div>
          </td>
          <td>${profile.contact_email || 'N/A'}</td>
          <td>${business.industry || 'N/A'}</td>
          <td>
            <span class="status-badge status-${status}">
              ${this.getStatusText(status)}
            </span>
          </td>
          <td>
            <div class="documents-count">
              <span class="icon">📄</span>
              <span>${this.getDocumentCount(business.id)}</span>
            </div>
          </td>
          <td>${this.formatDate(business.created_at)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-review" onclick="adminReviewManager.openReviewModal('${business.id}')">
                Review | مراجعة
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  getStatusText(status) {
    const statusTexts = {
      pending: 'Pending | قيد المراجعة',
      approved: 'Approved | موافق عليه',
      changes_requested: 'Changes Requested | طلب تعديلات',
      rejected: 'Rejected | مرفوض',
      deactivated: 'Deactivated | معطل'
    };
    return statusTexts[status] || status;
  }

  async getDocumentCount(businessId) {
    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('id')
        .eq('business_id', businessId);

      return error ? 0 : (data?.length || 0);
    } catch (error) {
      return 0;
    }
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async openReviewModal(businessId) {
    try {
      const business = this.businesses.find(b => b.id === businessId);
      if (!business) return;

      this.currentBusiness = business;
      await this.loadBusinessDetails(businessId);
      this.populateModal(business);
      this.showModal();
      
    } catch (error) {
      console.error('Error opening review modal:', error);
      this.showError('Failed to load business details.');
    }
  }

  async loadBusinessDetails(businessId) {
    try {
      // Load documents
      const { data: documents, error: docError } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', businessId);

      if (docError) throw docError;
      this.currentBusiness.documents = documents || [];

    } catch (error) {
      console.error('Error loading business details:', error);
      this.currentBusiness.documents = [];
    }
  }

  populateModal(business) {
    const profile = business.profiles || {};
    const verification = business.business_verifications?.[0];

    // Business info
    const businessInfo = document.getElementById('business-info');
    businessInfo.innerHTML = `
      <div class="info-item">
        <div class="info-label">Business Name | اسم المنشأة</div>
        <div class="info-value">${business.name || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Industry | الصناعة</div>
        <div class="info-value">${business.industry || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Country | الدولة</div>
        <div class="info-value">${business.country || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Contact Email | البريد الإلكتروني</div>
        <div class="info-value">${profile.contact_email || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone | الهاتف</div>
        <div class="info-value">${profile.phone || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">WhatsApp | واتساب</div>
        <div class="info-value">${profile.whatsapp || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Languages | اللغات</div>
        <div class="info-value">${(profile.languages || []).join(', ') || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Description | الوصف</div>
        <div class="info-value">${profile.about_short || 'N/A'}</div>
      </div>
    `;

    // Documents
    const documentsList = document.getElementById('documents-list');
    const documentTypes = ['license', 'incorporation', 'signature_auth', 'iban'];
    
    documentsList.innerHTML = documentTypes.map(type => {
      const document = business.documents?.find(doc => doc.kind === type);
      const typeNames = {
        license: 'Business License | رخصة العمل',
        incorporation: 'Articles of Incorporation | عقد التأسيس',
        signature_auth: 'Signature Authorization | تفويض التوقيع',
        iban: 'IBAN Certificate | شهادة الـIBAN'
      };

      return `
        <div class="document-item ${document ? 'uploaded' : ''}">
          <div class="document-icon">${document ? '📄' : '❌'}</div>
          <div class="document-name">${typeNames[type]}</div>
          ${document ? 
            `<a href="${document.file_url}" target="_blank" class="document-link">View File | عرض الملف</a>` :
            '<span class="document-link" style="color: #ef4444;">Not Uploaded | غير مرفوع</span>'
          }
        </div>
      `;
    }).join('');

    // Pre-fill notes if there are existing ones
    if (verification?.notes) {
      document.getElementById('review-notes').value = verification.notes;
    }
  }

  handleDecisionChange() {
    const decision = document.querySelector('input[name="decision"]:checked')?.value;
    const reasonsGroup = document.getElementById('reasons-group');
    
    if (decision === 'changes_requested') {
      reasonsGroup.style.display = 'block';
    } else {
      reasonsGroup.style.display = 'none';
    }
  }

  async submitReview() {
    try {
      const form = document.getElementById('review-form');
      const formData = new FormData(form);
      
      const decision = formData.get('decision');
      const notes = formData.get('notes');
      const reasons = formData.getAll('reasons');

      if (!decision) {
        this.showError('Please select a decision.');
        return;
      }

      if (decision === 'changes_requested' && reasons.length === 0) {
        this.showError('Please specify which changes are required.');
        return;
      }

      // Create verification record
      const verificationData = {
        business_id: this.currentBusiness.id,
        status: decision,
        notes: notes || null,
        reasons: decision === 'changes_requested' ? 
          reasons.reduce((acc, reason) => ({ ...acc, [reason]: 'Please update this document' }), {}) : 
          null
      };

      const { error: verificationError } = await supabase
        .from('business_verifications')
        .insert([verificationData]);

      if (verificationError) throw verificationError;

      // Update business status if needed
      if (decision === 'deactivate') {
        const { error: businessError } = await supabase
          .from('businesses')
          .update({ is_active: false })
          .eq('id', this.currentBusiness.id);

        if (businessError) throw businessError;
      } else if (decision === 'approve') {
        const { error: businessError } = await supabase
          .from('businesses')
          .update({ is_active: true })
          .eq('id', this.currentBusiness.id);

        if (businessError) throw businessError;
      }

      // Send notification to business owner
      await this.notifyUser(
        this.currentBusiness.owner_id,
        this.getNotificationTitle(decision),
        this.getNotificationBody(decision, notes)
      );

      this.showSuccess('Review submitted successfully!');
      this.closeModal();
      await this.loadBusinesses();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      this.showError('Failed to submit review. Please try again.');
    }
  }

  getNotificationTitle(decision) {
    const titles = {
      approve: 'Business Approved | تمت الموافقة على المنشأة',
      changes_requested: 'Changes Requested | طلب تعديلات',
      reject: 'Submission Rejected | تم رفض الطلب',
      deactivate: 'Account Deactivated | تم تعطيل الحساب'
    };
    return titles[decision] || 'Review Update | تحديث المراجعة';
  }

  getNotificationBody(decision, notes) {
    const bodies = {
      approve: 'Congratulations! Your business has been approved. You can now create events and bulletins.',
      changes_requested: 'Please review the requested changes and update your documents.',
      reject: 'Your submission was rejected. Please review and resubmit with the required changes.',
      deactivate: 'Your account has been deactivated. Please contact support for assistance.'
    };
    
    const baseBody = bodies[decision] || 'Your compliance status has been updated.';
    return notes ? `${baseBody}\n\nNotes: ${notes}` : baseBody;
  }

  async notifyUser(userId, title, body) {
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title: title,
          body: body,
          kind: 'info'
        }]);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  showModal() {
    document.getElementById('review-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    document.getElementById('review-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('review-form').reset();
    document.getElementById('reasons-group').style.display = 'none';
  }

  showLoading(show) {
    document.getElementById('loading-state').style.display = show ? 'block' : 'none';
  }

  showEmptyState(show) {
    document.getElementById('empty-state').style.display = show ? 'block' : 'none';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
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

// Initialize admin review manager
let adminReviewManager = null;

document.addEventListener('DOMContentLoaded', () => {
  adminReviewManager = new AdminReviewManager();
});

// Export for global access
window.AdminReviewManager = AdminReviewManager;
window.adminReviewManager = adminReviewManager;
