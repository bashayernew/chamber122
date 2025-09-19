// Admin Dashboard functionality
import { sb, requireAuth } from './supabase.js';
import { checkAccountCompleteness } from './account-completeness.js';

class AdminDashboard {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Require admin authentication
      await requireAuth('/auth.html');
      
      this.setupEventListeners();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error initializing admin dashboard:', error);
    }
  }

  setupEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadDashboardData() {
    await Promise.all([
      this.loadStats(),
      this.loadApprovals(),
      this.loadGuestSubmissions(),
      this.loadNeedsSetup()
    ]);
  }

  async loadStats() {
    try {
      // Load MSME stats
      const { data: msmes } = await sb().from('businesses').select('id, status');
      const totalMsmes = msmes?.length || 0;
      const pendingApprovals = msmes?.filter(m => m.status === 'pending').length || 0;

      // Load event stats
      const { data: events } = await sb().from('events').select('id');
      const totalEvents = events?.length || 0;

      // Load bulletin stats
      const { data: bulletins } = await sb().from('bulletins').select('id');
      const totalBulletins = bulletins?.length || 0;

      // Update UI
      document.getElementById('total-msmes').textContent = totalMsmes;
      document.getElementById('pending-approvals').textContent = pendingApprovals;
      document.getElementById('total-events').textContent = totalEvents;
      document.getElementById('total-bulletins').textContent = totalBulletins;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadApprovals() {
    try {
      const { data: accounts } = await sb()
        .from('businesses')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const container = document.getElementById('approvals-list');
      
      if (!accounts || accounts.length === 0) {
        container.innerHTML = '<p>No pending approvals</p>';
        return;
      }

      container.innerHTML = accounts.map(account => `
        <div class="approval-item">
          <div class="approval-info">
            <h3>${account.name}</h3>
            <p>Category: ${account.category || 'N/A'}</p>
            <p>Profile Completeness: ${account.profile_completeness}%</p>
            <p>Submitted: ${new Date(account.created_at).toLocaleDateString()}</p>
          </div>
          <div class="approval-actions">
            <button class="btn-approve" onclick="adminDashboard.approveAccount('${account.id}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-reject" onclick="adminDashboard.rejectAccount('${account.id}')">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading approvals:', error);
    }
  }

  async loadGuestSubmissions() {
    await Promise.all([
      this.loadEventSuggestions(),
      this.loadBulletinSubmissions()
    ]);
  }

  async loadNeedsSetup() {
    try {
      // Get all users with draft bulletins
      const { data: draftBulletins } = await sb()
        .from('bulletins')
        .select(`
          id,
          title,
          status,
          created_at,
          owner_user_id,
          businesses:business_id (
            business_name,
            owner_id,
            profiles:owner_id (
              full_name,
              email,
              role
            )
          )
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (!draftBulletins) return;

      // Group by user and check completeness
      const userGroups = {};
      for (const bulletin of draftBulletins) {
        const userId = bulletin.owner_user_id;
        if (!userGroups[userId]) {
          userGroups[userId] = {
            user: bulletin.businesses?.profiles,
            business: bulletin.businesses,
            bulletins: []
          };
        }
        userGroups[userId].bulletins.push(bulletin);
      }

      // Check completeness for each user
      const needsSetup = [];
      for (const [userId, userData] of Object.entries(userGroups)) {
        if (userData.user && userData.business) {
          // Create a mock completeness check
          const missingFields = [];
          
          if (!userData.user.full_name) missingFields.push('Full name');
          if (!userData.user.email_verified) missingFields.push('Email verification');
          if (!userData.user.phone) missingFields.push('Phone number');
          if (!['provider_individual', 'provider_company'].includes(userData.user.role)) {
            missingFields.push('Provider role');
          }
          if (!userData.business.business_name) missingFields.push('Business name');
          if (!userData.business.sector) missingFields.push('Business sector');
          if (!userData.business.city) missingFields.push('Business city');

          if (missingFields.length > 0) {
            needsSetup.push({
              userId,
              user: userData.user,
              business: userData.business,
              bulletins: userData.bulletins,
              missingFields
            });
          }
        }
      }

      this.renderNeedsSetup(needsSetup);
    } catch (error) {
      console.error('Error loading needs setup:', error);
    }
  }

  async loadEventSuggestions() {
    try {
      const { data: suggestions } = await sb()
        .from('event_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const container = document.getElementById('event-suggestions-list');
      
      if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '<p>No pending event suggestions</p>';
        return;
      }

      container.innerHTML = suggestions.map(suggestion => `
        <div class="submission-item">
          <div class="submission-info">
            <h3>${suggestion.title}</h3>
            <p>Date: ${suggestion.date}</p>
            <p>Location: ${suggestion.location || 'N/A'}</p>
            <p>Submitted by: ${suggestion.submitter_email}</p>
            <p>Description: ${suggestion.description}</p>
          </div>
          <div class="submission-actions">
            <button class="btn-approve" onclick="adminDashboard.approveEventSuggestion('${suggestion.id}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-reject" onclick="adminDashboard.rejectEventSuggestion('${suggestion.id}')">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading event suggestions:', error);
    }
  }

  async loadBulletinSubmissions() {
    try {
      const { data: submissions } = await sb()
        .from('bulletin_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const container = document.getElementById('bulletin-submissions-list');
      
      if (!submissions || submissions.length === 0) {
        container.innerHTML = '<p>No pending bulletin submissions</p>';
        return;
      }

      container.innerHTML = submissions.map(submission => `
        <div class="submission-item">
          <div class="submission-info">
            <h3>${submission.title}</h3>
            <p>Content: ${submission.content.substring(0, 200)}...</p>
            <p>Submitted by: ${submission.submitter_email}</p>
          </div>
          <div class="submission-actions">
            <button class="btn-approve" onclick="adminDashboard.approveBulletinSubmission('${submission.id}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-reject" onclick="adminDashboard.rejectBulletinSubmission('${submission.id}')">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading bulletin submissions:', error);
    }
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'approvals':
        await this.loadApprovals();
        break;
      case 'needs-setup':
        await this.loadNeedsSetup();
        break;
      case 'guest-submissions':
        await this.loadGuestSubmissions();
        break;
      case 'content':
        // Load content management data
        break;
      case 'analytics':
        // Load analytics data
        break;
    }
  }

  async approveAccount(accountId) {
    try {
      const { error } = await sb()
        .from('businesses')
        .update({ status: 'approved' })
        .eq('id', accountId);

      if (error) throw error;

      alert('Account approved successfully');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error approving account:', error);
      alert('Error approving account');
    }
  }

  async rejectAccount(accountId) {
    try {
      // Get the business details first
      const { data: business } = await sb()
        .from('businesses')
        .select('*, profiles:owner_id(*)')
        .eq('id', accountId)
        .single();

      if (!business) throw new Error('Business not found');

      // Update business status
      const { error } = await sb()
        .from('businesses')
        .update({ status: 'rejected' })
        .eq('id', accountId);

      if (error) throw error;

      // Create notification for the MSME
      await this.createNotification({
        user_id: business.owner_id,
        type: 'document_rejected',
        title: 'Document Submission Rejected',
        message: 'Your business profile documents have been rejected. Please review and resubmit with the required corrections.',
        business_id: accountId
      });

      alert('Account rejected and notification sent to MSME');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error rejecting account:', error);
      alert('Error rejecting account');
    }
  }

  async createNotification(notificationData) {
    try {
      const { error } = await sb()
        .from('notifications')
        .insert([{
          user_id: notificationData.user_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          business_id: notificationData.business_id,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async approveEventSuggestion(suggestionId) {
    try {
      // Get the suggestion
      const { data: suggestion } = await sb()
        .from('event_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (!suggestion) throw new Error('Suggestion not found');

      // Create event (you might want to link to an account)
      const { error: eventError } = await sb()
        .from('events')
        .insert({
          title: suggestion.title,
          description: suggestion.description,
          location: suggestion.location,
          starts_at: suggestion.date,
          status: 'published'
        });

      if (eventError) throw eventError;

      // Mark suggestion as approved
      const { error: updateError } = await sb()
        .from('event_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      alert('Event suggestion approved and published');
      await this.loadEventSuggestions();
    } catch (error) {
      console.error('Error approving event suggestion:', error);
      alert('Error approving event suggestion');
    }
  }

  async rejectEventSuggestion(suggestionId) {
    try {
      const { error } = await sb()
        .from('event_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      alert('Event suggestion rejected');
      await this.loadEventSuggestions();
    } catch (error) {
      console.error('Error rejecting event suggestion:', error);
      alert('Error rejecting event suggestion');
    }
  }

  async approveBulletinSubmission(submissionId) {
    try {
      // Get the submission
      const { data: submission } = await sb()
        .from('bulletin_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (!submission) throw new Error('Submission not found');

      // Create bulletin (you might want to link to an account)
      const { error: bulletinError } = await sb()
        .from('bulletins')
        .insert({
          title: submission.title,
          content: submission.content,
          status: 'published'
        });

      if (bulletinError) throw bulletinError;

      // Mark submission as approved
      const { error: updateError } = await sb()
        .from('bulletin_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      alert('Bulletin submission approved and published');
      await this.loadBulletinSubmissions();
    } catch (error) {
      console.error('Error approving bulletin submission:', error);
      alert('Error approving bulletin submission');
    }
  }

  async rejectBulletinSubmission(submissionId) {
    try {
      const { error } = await sb()
        .from('bulletin_submissions')
        .update({ status: 'rejected' })
        .eq('id', submissionId);

      if (error) throw error;

      alert('Bulletin submission rejected');
      await this.loadBulletinSubmissions();
    } catch (error) {
      console.error('Error rejecting bulletin submission:', error);
      alert('Error rejecting bulletin submission');
    }
  }

  renderNeedsSetup(needsSetup) {
    const container = document.getElementById('needs-setup');
    if (!container) return;

    if (needsSetup.length === 0) {
      container.innerHTML = '<p>No users need setup assistance.</p>';
      return;
    }

    container.innerHTML = needsSetup.map(item => `
      <div class="needs-setup-card">
        <div class="setup-header">
          <h4>${item.user.full_name || 'Unknown User'}</h4>
          <span class="setup-status">Needs Setup</span>
        </div>
        
        <div class="setup-details">
          <p><strong>Email:</strong> ${item.user.email}</p>
          <p><strong>Business:</strong> ${item.business.business_name || 'Not specified'}</p>
          <p><strong>Role:</strong> ${item.user.role || 'Not set'}</p>
        </div>
        
        <div class="missing-fields">
          <h5>Missing Fields:</h5>
          <ul>
            ${item.missingFields.map(field => `<li>${field}</li>`).join('')}
          </ul>
        </div>
        
        <div class="draft-bulletins">
          <h5>Draft Bulletins (${item.bulletins.length}):</h5>
          <ul>
            ${item.bulletins.map(bulletin => `
              <li>${bulletin.title} - ${new Date(bulletin.created_at).toLocaleDateString()}</li>
            `).join('')}
          </ul>
        </div>
        
        <div class="setup-actions">
          <button onclick="adminDashboard.contactUser('${item.userId}')" class="btn btn-primary">
            <i class="fas fa-envelope"></i> Contact User
          </button>
          <button onclick="adminDashboard.viewUserProfile('${item.userId}')" class="btn btn-secondary">
            <i class="fas fa-user"></i> View Profile
          </button>
        </div>
      </div>
    `).join('');
  }

  contactUser(userId) {
    // Placeholder for contacting user
    alert(`Contact functionality for user ${userId} would be implemented here.`);
  }

  viewUserProfile(userId) {
    // Placeholder for viewing user profile
    alert(`View profile functionality for user ${userId} would be implemented here.`);
  }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();

// Export for global access
window.adminDashboard = adminDashboard;
