// Admin Dashboard functionality
import { supabase } from './supabase-client.js';
import { requireAuth } from './supabase.js';
import { checkAccountCompleteness } from './account-completeness.js';

class AdminDashboard {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/admin-login.html';
        return;
      }
      
      // Check if user is admin
      const isAdmin = await this.checkAdminStatus();
      if (!isAdmin) {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/admin-login.html';
        return;
      }
      
      this.setupEventListeners();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error initializing admin dashboard:', error);
      window.location.href = '/admin-login.html';
    }
  }

  async checkAdminStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Check if user is the specific admin
      if (user.email === 'bashayer@123123') {
        // Ensure admin record exists
        const { error } = await supabase
          .from('admins')
          .upsert({ user_id: user.id }, { onConflict: 'user_id' });
        if (error) console.warn('Could not update admins table:', error);
        return true;
      }
      
      // Also check admins table
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return !!adminData;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
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
      const { data: msmes } = await supabase.from('businesses').select('id, status');
      const totalMsmes = msmes?.length || 0;
      const pendingApprovals = msmes?.filter(m => m.status === 'pending').length || 0;

      // Load event stats
      const { data: activities } = await supabase.from('activities').select('id, type, kind');
      const normalized = (activities || []).map(r => ({ ...r, type: r.type ?? r.kind }));
      const totalEvents = normalized.filter(a => a.type === 'event').length;

      // Load bulletin stats
      const totalBulletins = normalized.filter(a => a.type === 'bulletin').length;

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
      // Get all businesses with their documents
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!businesses || businesses.length === 0) {
        document.getElementById('approvals-list').innerHTML = '<p>No users found</p>';
        return;
      }

      // Get documents for all businesses
      const businessIds = businesses.map(b => b.id);
      let allDocuments = [];
      if (businessIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .in('business_id', businessIds);
        if (!docsError) {
          allDocuments = docs || [];
        }
      }

      // Get user profiles
      const ownerIds = businesses.map(b => b.owner_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ownerIds);

      // Group documents by business
      const documentsByBusiness = {};
      (allDocuments || []).forEach(doc => {
        if (!documentsByBusiness[doc.business_id]) {
          documentsByBusiness[doc.business_id] = [];
        }
        documentsByBusiness[doc.business_id].push(doc);
      });

      // Create profiles map
      const profilesMap = {};
      (profiles || []).forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      const container = document.getElementById('approvals-list');
      container.innerHTML = businesses.map(business => {
        const docs = documentsByBusiness[business.id] || [];
        const profile = profilesMap[business.owner_id] || {};
        const status = business.status || business.is_active ? 'approved' : 'pending';
        
        const docTypes = {
          'civil_id_front': 'Civil ID Front',
          'civil_id_back': 'Civil ID Back',
          'owner_proof': 'Owner Proof'
        };

        return `
          <div class="approval-item" data-business-id="${business.id}">
            <div class="approval-info">
              <div class="user-header">
                <h3>${business.name || business.legal_name || 'Unnamed Business'}</h3>
                <span class="status-badge status-${status}">${status}</span>
              </div>
              <div class="user-details">
                <p><strong>Email:</strong> ${profile.contact_email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${profile.phone || business.phone || 'N/A'}</p>
                <p><strong>Business ID:</strong> ${business.id}</p>
                <p><strong>Created:</strong> ${new Date(business.created_at).toLocaleDateString()}</p>
                ${business.industry ? `<p><strong>Industry:</strong> ${business.industry}</p>` : ''}
                ${business.city ? `<p><strong>City:</strong> ${business.city}</p>` : ''}
              </div>
              <div class="documents-section">
                <h4>Documents:</h4>
                <div class="documents-list">
                  ${Object.keys(docTypes).map(docType => {
                    const doc = docs.find(d => d.kind === docType);
                    return `
                      <div class="document-item ${doc ? 'uploaded' : 'missing'}">
                        <span class="doc-icon">${doc ? '✓' : '✗'}</span>
                        <span class="doc-name">${docTypes[docType]}</span>
                        ${doc ? `
                          <a href="${doc.file_url}" target="_blank" class="doc-link">View</a>
                          <button class="btn-small btn-issue" onclick="adminDashboard.showMessageModal('${business.owner_id}', '${business.id}', '${docType}')">
                            Report Issue
                          </button>
                        ` : '<span class="doc-missing">Not uploaded</span>'}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
            <div class="approval-actions">
              ${status === 'pending' ? `
                <button class="btn-approve" onclick="adminDashboard.approveAccount('${business.id}', '${business.owner_id}')">
                  <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn-reject" onclick="adminDashboard.rejectAccount('${business.id}', '${business.owner_id}')">
                  <i class="fas fa-times"></i> Reject
                </button>
              ` : ''}
              ${status === 'approved' ? `
                <button class="btn-suspend" onclick="adminDashboard.suspendAccount('${business.id}', '${business.owner_id}')">
                  <i class="fas fa-ban"></i> Suspend
                </button>
              ` : ''}
              ${status === 'suspended' ? `
                <button class="btn-approve" onclick="adminDashboard.unsuspendAccount('${business.id}', '${business.owner_id}')">
                  <i class="fas fa-check"></i> Unsuspend
                </button>
              ` : ''}
              <button class="btn-view" onclick="adminDashboard.viewUserDetails('${business.owner_id}', '${business.id}')">
                <i class="fas fa-eye"></i> View Details
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Error loading approvals:', error);
      document.getElementById('approvals-list').innerHTML = `<p>Error loading users: ${error.message}</p>`;
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
      const { data: draftBulletins } = await supabase
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
      const { data: suggestions } = await supabase
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
      const { data: submissions } = await supabase
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

  async approveAccount(businessId, userId) {
    if (!confirm('Are you sure you want to approve this account?')) return;
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'approved',
          is_active: true 
        })
        .eq('id', businessId);

      if (error) throw error;

      // Create notification
      await this.createNotification({
        user_id: userId,
        title: 'Account Approved',
        body: 'Your account has been approved! You can now access all features.',
        kind: 'success'
      });

      alert('Account approved successfully');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error approving account:', error);
      alert('Error approving account: ' + error.message);
    }
  }

  async rejectAccount(businessId, userId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'rejected',
          is_active: false 
        })
        .eq('id', businessId);

      if (error) throw error;

      // Create notification
      await this.createNotification({
        user_id: userId,
        title: 'Account Rejected',
        body: `Your account has been rejected. Reason: ${reason}`,
        kind: 'error'
      });

      alert('Account rejected and notification sent');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error rejecting account:', error);
      alert('Error rejecting account: ' + error.message);
    }
  }

  async suspendAccount(businessId, userId) {
    if (!confirm('Are you sure you want to suspend this account?')) return;
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'suspended',
          is_active: false 
        })
        .eq('id', businessId);

      if (error) throw error;

      // Create notification
      await this.createNotification({
        user_id: userId,
        title: 'Account Suspended',
        body: 'Your account has been suspended. Please contact support for more information.',
        kind: 'warning'
      });

      alert('Account suspended successfully');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error suspending account:', error);
      alert('Error suspending account: ' + error.message);
    }
  }

  async unsuspendAccount(businessId, userId) {
    if (!confirm('Are you sure you want to unsuspend this account?')) return;
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'approved',
          is_active: true 
        })
        .eq('id', businessId);

      if (error) throw error;

      // Create notification
      await this.createNotification({
        user_id: userId,
        title: 'Account Unsuspended',
        body: 'Your account has been unsuspended. You can now access all features.',
        kind: 'success'
      });

      alert('Account unsuspended successfully');
      await this.loadApprovals();
      await this.loadStats();
    } catch (error) {
      console.error('Error unsuspending account:', error);
      alert('Error unsuspending account: ' + error.message);
    }
  }

  showMessageModal(userId, businessId, documentType) {
    const docTypeNames = {
      'civil_id_front': 'Civil ID Front',
      'civil_id_back': 'Civil ID Back',
      'owner_proof': 'Owner Proof'
    };

    const subject = prompt(`Enter subject for message about ${docTypeNames[documentType] || documentType}:`, `Issue with ${docTypeNames[documentType] || documentType}`);
    if (!subject) return;

    const message = prompt(`Enter message to send to user about ${docTypeNames[documentType] || documentType}:`, `The ${docTypeNames[documentType] || documentType} document you submitted has an issue. Please review and resubmit.`);
    if (!message) return;

    this.sendMessageToUser(userId, businessId, subject, message, documentType);
  }

  async sendMessageToUser(userId, businessId, subject, message, documentType) {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: userId,
          business_id: businessId,
          admin_id: adminUser.id,
          subject: subject,
          message: message,
          document_type: documentType,
          status: 'open'
        });

      if (error) throw error;

      // Also create a notification
      await this.createNotification({
        user_id: userId,
        title: 'Message from Admin',
        body: `You have a new message: ${subject}`,
        kind: 'info'
      });

      alert('Message sent to user successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  }

  async viewUserDetails(userId, businessId) {
    // Open a modal or new page with user details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

      let documents = [];
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('business_id', businessId);
      if (!docsError) {
        documents = docs || [];
      }

    const { data: messages } = await supabase
      .from('admin_messages')
      .select('*, admin_message_responses(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const details = `
      Business: ${business?.name || 'N/A'}
      Documents: ${documents?.length || 0}
      Messages: ${messages?.length || 0}
    `;

    alert('User Details:\n\n' + details + '\n\nFull details would be shown in a modal.');
  }

  async createNotification(notificationData) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notificationData.user_id,
          title: notificationData.title,
          body: notificationData.body || notificationData.message,
          kind: notificationData.kind || 'info'
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
      const { data: suggestion } = await supabase
        .from('event_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (!suggestion) throw new Error('Suggestion not found');

      // Create event (you might want to link to an account)
      const { error: eventError } = await supabase
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
      const { error: updateError } = await supabase
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
      const { error } = await supabase
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
      const { data: submission } = await supabase
        .from('bulletin_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (!submission) throw new Error('Submission not found');

      // Create bulletin (you might want to link to an account)
      const { error: bulletinError } = await supabase
        .from('bulletins')
        .insert({
          title: submission.title,
          content: submission.content,
          status: 'published'
        });

      if (bulletinError) throw bulletinError;

      // Mark submission as approved
      const { error: updateError } = await supabase
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
      const { error } = await supabase
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
