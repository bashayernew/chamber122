// Compliance Page JavaScript
// Handles business information and document uploads

import { supabase } from './supabase-client.js';

class ComplianceManager {
  constructor() {
    this.currentStep = 1;
    this.businessData = {};
    this.documents = {};
    this.complianceStatus = null;
    this.init();
  }

  async init() {
    await this.loadComplianceStatus();
    this.setupEventListeners();
    this.loadBusinessData();
    this.updateUI();
  }

  setupEventListeners() {
    // Step navigation
    document.getElementById('next-step-1')?.addEventListener('click', () => this.nextStep());
    document.getElementById('prev-step-2')?.addEventListener('click', () => this.prevStep());
    
    // Form submission
    document.getElementById('business-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBusinessInfo();
    });
    
    // Document uploads
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleFileUpload(e));
    });
    
    // Document removal
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-file')) {
        this.removeDocument(e.target.closest('.document-card'));
      }
    });
    
    // Save documents
    document.getElementById('save-documents')?.addEventListener('click', () => this.saveDocuments());
    
    // Submit for review
    document.getElementById('submit-review')?.addEventListener('click', () => this.submitForReview());
    
    // Banner action
    document.getElementById('banner-action')?.addEventListener('click', () => {
      window.location.href = '#compliance-form';
    });
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

      if (business) {
        this.businessData = business;
        
        // Get latest verification status
        const { data: verification, error: verificationError } = await supabase
          .from('v_business_verification_latest')
          .select('*')
          .eq('business_id', business.id)
          .single();

        if (verification) {
          this.complianceStatus = verification;
        }
      }
    } catch (error) {
      console.error('Error loading compliance status:', error);
    }
  }

  async loadBusinessData() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Load profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && !profileError) {
        this.businessData = { ...this.businessData, ...profile };
      }

      // Load documents
      if (this.businessData.id) {
        const { data: documents, error: documentsError } = await supabase
          .from('business_documents')
          .select('*')
          .eq('business_id', this.businessData.id);

        if (documents && !documentsError) {
          documents.forEach(doc => {
            this.documents[doc.kind] = doc;
          });
        }
      }

      this.populateForm();
      this.updateDocumentStatuses();
    } catch (error) {
      console.error('Error loading business data:', error);
    }
  }

  populateForm() {
    // Populate business form
    const form = document.getElementById('business-form');
    if (!form) return;

    const fields = [
      'name', 'industry', 'country', 'contact_email', 
      'phone', 'whatsapp', 'about_short'
    ];

    fields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && this.businessData[field]) {
        input.value = this.businessData[field];
      }
    });

    // Populate languages
    if (this.businessData.languages) {
      const languageInputs = form.querySelectorAll('input[name="languages"]');
      languageInputs.forEach(input => {
        input.checked = this.businessData.languages.includes(input.value);
      });
    }
  }

  updateDocumentStatuses() {
    const documentCards = document.querySelectorAll('.document-card');
    documentCards.forEach(card => {
      const documentType = card.dataset.document;
      const document = this.documents[documentType];
      
      if (document) {
        this.updateDocumentCard(card, document);
      }
    });
  }

  updateDocumentCard(card, document) {
    const statusIcon = card.querySelector('.status-icon');
    const statusText = card.querySelector('.status-text');
    const uploadArea = card.querySelector('.document-upload');
    const previewArea = card.querySelector('.document-preview');
    const fileLink = card.querySelector('.file-link');

    if (statusIcon && statusText) {
      statusIcon.textContent = '✅';
      statusText.textContent = 'Uploaded';
    }

    if (uploadArea && previewArea) {
      uploadArea.style.display = 'none';
      previewArea.style.display = 'flex';
    }

    if (fileLink) {
      fileLink.href = document.file_url;
      fileLink.textContent = document.file_name || 'View File | عرض الملف';
    }

    card.classList.add('uploaded');
  }

  nextStep() {
    if (this.currentStep === 1) {
      this.saveBusinessInfo();
      this.currentStep = 2;
      this.updateStepUI();
    }
  }

  prevStep() {
    if (this.currentStep === 2) {
      this.currentStep = 1;
      this.updateStepUI();
    }
  }

  updateStepUI() {
    // Update step navigation
    document.querySelectorAll('.step-item').forEach((item, index) => {
      item.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update step content
    document.querySelectorAll('.compliance-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
    });
  }

  async saveBusinessInfo() {
    try {
      const form = document.getElementById('business-form');
      const formData = new FormData(form);
      
      const businessInfo = {
        name: formData.get('name'),
        industry: formData.get('industry'),
        country: formData.get('country'),
        contact_email: formData.get('contact_email'),
        phone: formData.get('phone'),
        whatsapp: formData.get('whatsapp'),
        about_short: formData.get('about_short'),
        languages: formData.getAll('languages')
      };

      const user = await this.getCurrentUser();
      if (!user) {
        this.showError('Please log in to save your information.');
        return;
      }

      // Save or update business
      if (this.businessData.id) {
        const { error } = await supabase
          .from('businesses')
          .update(businessInfo)
          .eq('id', this.businessData.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('businesses')
          .insert([{ ...businessInfo, owner_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        this.businessData.id = data.id;
      }

      // Save or update profile
      const profileData = {
        contact_email: businessInfo.contact_email,
        phone: businessInfo.phone,
        whatsapp: businessInfo.whatsapp,
        languages: businessInfo.languages,
        about_short: businessInfo.about_short
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...profileData });

      if (profileError) throw profileError;

      this.businessData = { ...this.businessData, ...businessInfo };
      this.showSuccess('Business information saved successfully!');
      
    } catch (error) {
      console.error('Error saving business info:', error);
      this.showError('Failed to save business information. Please try again.');
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const documentType = event.target.closest('.document-card').dataset.document;
    const card = event.target.closest('.document-card');
    
    try {
      // Show loading state
      this.showUploadProgress(card, 0);
      
      // Upload file using file upload manager
      const result = await window.fileUploadManager.uploadFile(file, this.businessData.id, documentType);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Save document record
      const documentData = {
        business_id: this.businessData.id,
        kind: documentType,
        file_url: result.publicUrl,
        file_name: file.name,
        file_size: result.fileSize
      };

      const { error: docError } = await supabase
        .from('business_documents')
        .upsert(documentData, { onConflict: 'business_id,kind' });

      if (docError) throw docError;

      this.documents[documentType] = documentData;
      this.updateDocumentCard(card, documentData);
      this.checkAllDocumentsUploaded();
      this.hideUploadProgress(card);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      this.showError(`Failed to upload file: ${error.message}`);
      this.hideUploadProgress(card);
    }
  }

  showUploadProgress(card, progress) {
    const progressBar = card.querySelector('.upload-progress') || this.createProgressBar(card);
    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  hideUploadProgress(card) {
    const progressBar = card.querySelector('.upload-progress');
    if (progressBar) {
      progressBar.remove();
    }
  }

  createProgressBar(card) {
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress';
    progressBar.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(75, 85, 99, 0.3);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    `;

    progressBar.innerHTML = `
      <div class="progress-fill" style="
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        width: 0%;
        transition: width 0.3s ease;
      "></div>
      <div class="progress-text" style="
        text-align: center;
        color: #9ca3af;
        font-size: 0.8rem;
        margin-top: 0.5rem;
      ">0%</div>
    `;

    card.appendChild(progressBar);
    return progressBar;
  }

  removeDocument(card) {
    const documentType = card.dataset.document;
    
    // Reset card UI
    const statusIcon = card.querySelector('.status-icon');
    const statusText = card.querySelector('.status-text');
    const uploadArea = card.querySelector('.document-upload');
    const previewArea = card.querySelector('.document-preview');
    const fileInput = card.querySelector('.file-input');

    if (statusIcon && statusText) {
      statusIcon.textContent = '❌';
      statusText.textContent = 'Not Uploaded';
    }

    if (uploadArea && previewArea) {
      uploadArea.style.display = 'block';
      previewArea.style.display = 'none';
    }

    if (fileInput) {
      fileInput.value = '';
    }

    card.classList.remove('uploaded');
    delete this.documents[documentType];
    this.checkAllDocumentsUploaded();
  }

  checkAllDocumentsUploaded() {
    const requiredDocuments = ['license', 'incorporation', 'signature_auth', 'iban'];
    const uploadedCount = requiredDocuments.filter(doc => this.documents[doc]).length;
    
    const submitButton = document.getElementById('submit-review');
    if (submitButton) {
      submitButton.style.display = uploadedCount === requiredDocuments.length ? 'block' : 'none';
    }
  }

  async saveDocuments() {
    this.showSuccess('Documents saved successfully!');
  }

  async submitForReview() {
    try {
      if (!this.businessData.id) {
        this.showError('Please save your business information first.');
        return;
      }

      const user = await this.getCurrentUser();
      if (!user) {
        this.showError('Please log in to submit for review.');
        return;
      }

      // Create verification record
      const { error } = await supabase
        .from('business_verifications')
        .insert([{
          business_id: this.businessData.id,
          status: 'pending',
          notes: 'Submitted for review'
        }]);

      if (error) throw error;

      // Send notification
      await this.notifyUser(user.id, 'Document Review Submitted', 'Your documents have been submitted for review.');

      this.showSuccess('Documents submitted for review successfully!');
      await this.loadComplianceStatus();
      this.updateUI();
      
    } catch (error) {
      console.error('Error submitting for review:', error);
      this.showError('Failed to submit for review. Please try again.');
    }
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

  updateUI() {
    this.updateStatusBanner();
    this.updateStatusCard();
  }

  updateStatusBanner() {
    const banner = document.getElementById('compliance-banner');
    const title = document.getElementById('banner-title');
    const subtitle = document.getElementById('banner-subtitle');
    const action = document.getElementById('banner-action');

    if (!banner || !this.complianceStatus) return;

    const status = this.complianceStatus.status;
    
    banner.className = 'compliance-banner';
    banner.style.display = 'block';

    switch (status) {
      case 'pending':
        banner.classList.add('warning');
        title.textContent = 'Under Review | قيد المراجعة';
        subtitle.textContent = 'Your documents are being reviewed by our team.';
        action.textContent = 'Update Documents | تحديث المستندات';
        break;
        
      case 'changes_requested':
        banner.classList.add('warning');
        title.textContent = 'Changes Requested | طلب تعديلات';
        subtitle.textContent = 'Please review the requested changes and update your documents.';
        action.textContent = 'Update Now | تحديث الآن';
        break;
        
      case 'approved':
        banner.classList.add('success');
        title.textContent = 'Approved | تمت الموافقة';
        subtitle.textContent = 'Your business has been approved! You can now create events and bulletins.';
        action.textContent = 'View Dashboard | عرض لوحة التحكم';
        break;
        
      case 'rejected':
        banner.classList.add('error');
        title.textContent = 'Rejected | مرفوض';
        subtitle.textContent = 'Your submission was rejected. Please review and resubmit.';
        action.textContent = 'Resubmit | إعادة إرسال';
        break;
        
      case 'deactivated':
        banner.classList.add('error');
        title.textContent = 'Deactivated | معطل';
        subtitle.textContent = 'Your account has been deactivated. Please contact support.';
        action.textContent = 'Contact Support | اتصل بالدعم';
        break;
    }
  }

  updateStatusCard() {
    const statusChip = document.getElementById('status-chip');
    const statusDetails = document.getElementById('status-details');

    if (!statusChip || !this.complianceStatus) return;

    const status = this.complianceStatus.status;
    
    statusChip.className = 'status-chip';
    statusChip.classList.add(`status-${status}`);

    const statusTexts = {
      pending: 'Under Review | قيد المراجعة',
      approved: 'Approved | تمت الموافقة',
      changes_requested: 'Changes Requested | طلب تعديلات',
      rejected: 'Rejected | مرفوض',
      deactivated: 'Deactivated | معطل'
    };

    statusChip.querySelector('.status-text').textContent = statusTexts[status] || 'Unknown';

    if (statusDetails) {
      let detailsHTML = '';
      
      if (this.complianceStatus.notes) {
        detailsHTML += `<h4>Notes | ملاحظات</h4><p>${this.complianceStatus.notes}</p>`;
      }
      
      if (this.complianceStatus.reasons) {
        detailsHTML += '<h4>Required Changes | التغييرات المطلوبة</h4><ul>';
        Object.entries(this.complianceStatus.reasons).forEach(([field, reason]) => {
          detailsHTML += `<li><strong>${field}:</strong> ${reason}</li>`;
        });
        detailsHTML += '</ul>';
      }
      
      statusDetails.innerHTML = detailsHTML;
    }
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
}

// Initialize compliance manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ComplianceManager();
});
