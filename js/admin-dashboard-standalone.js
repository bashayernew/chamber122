// Admin Dashboard functionality (No Supabase - Standalone)
import { 
  requireAdminAuth, 
  getAllUsers, 
  getAllDocuments, 
  updateUserStatus,
  createAdminMessage,
  getAdminMessages,
  saveAdminMessages,
  getDocumentsByUserId,
  deleteUser,
  removeDemoAccounts,
  getUserById,
  saveUsers
} from './admin-auth.js';
import { autoImportBusinesses } from './admin-import-data.js';
import { 
  getTotalViews, 
  getUniqueVisitors, 
  getTodayViews, 
  getViewsByPage, 
  getViewsByDate 
} from './visitor-tracking.js';

// Don't auto-initialize sample data - let real signups populate the data

class AdminDashboard {
  constructor() {
    this.allUsers = []; // Store all users for filtering
    this.filteredUsers = []; // Store filtered users
    this.init();
  }

  async init() {
    try {
      // Check admin authentication
      if (!requireAdminAuth()) {
        return;
      }
      
      // Remove demo accounts first
      removeDemoAccounts();
      
      this.setupEventListeners();
      
      // Import existing businesses from API first
      console.log('[admin-dashboard] Importing existing businesses from API...');
      try {
        await autoImportBusinesses();
      } catch (importError) {
        console.warn('[admin-dashboard] Could not import from API, using localStorage data:', importError);
      }
      
      // Remove demo accounts again after import (in case import added them)
      removeDemoAccounts();
      
      await this.loadDashboardData();
      
      // Listen for storage changes (when new users sign up)
      window.addEventListener('storage', (e) => {
        if (e.key === 'chamber122_users' || e.key === 'chamber122_documents') {
          console.log('[admin-dashboard] Storage updated, refreshing data...');
          this.loadDashboardData();
        }
      });
      
      // Also listen for custom events (for same-tab updates)
      window.addEventListener('userSignup', () => {
        console.log('[admin-dashboard] New user signup detected, refreshing...');
        this.loadDashboardData();
      });
      
      // Listen for documents updated events
      window.addEventListener('documentsUpdated', (e) => {
        console.log('[admin-dashboard] Documents updated event received, refreshing...', e.detail);
        this.loadDashboardData();
      });
    } catch (error) {
      console.error('Error initializing admin dashboard:', error);
      window.location.href = '/admin-login.html';
    }
  }

  setupEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Search and filter inputs
    const searchInput = document.getElementById('admin-search-input');
    const statusFilter = document.getElementById('admin-status-filter');
    const clearFiltersBtn = document.getElementById('admin-clear-filters');
    
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }
    
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }
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
    try {
      // Try to import from API first (in case new businesses were added)
      try {
        await autoImportBusinesses();
      } catch (importError) {
        // Silently fail - use existing localStorage data
        console.debug('[admin-dashboard] Import skipped:', importError.message);
      }
      
      await Promise.all([
        this.loadStats(),
        this.loadApprovals()
      ]);
      console.log('[admin-dashboard] Data refreshed successfully');
    } catch (error) {
      console.error('[admin-dashboard] Error refreshing data:', error);
    }
  }

  getDocumentUrl(fileUrl) {
    if (!fileUrl || fileUrl === '#') return '#';
    
    // If URL is already absolute (starts with http:// or https://), use it as-is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // If URL starts with /uploads/, prepend backend server URL
    if (fileUrl.startsWith('/uploads/')) {
      return `http://localhost:4000${fileUrl}`;
    }
    
    // If URL doesn't start with /, assume it's a relative path and prepend /uploads/
    if (!fileUrl.startsWith('/')) {
      return `http://localhost:4000/uploads/${fileUrl}`;
    }
    
    // Default: prepend backend server URL
    return `http://localhost:4000${fileUrl}`;
  }

  async loadStats() {
    try {
      const users = getAllUsers();
      const totalUsers = users.length;
      // Load admin dashboard state to get accurate status counts
      const stateKey = 'chamber_admin_dashboard_state';
      const state = JSON.parse(localStorage.getItem(stateKey) || '{}');
      const userStatuses = state.userStatuses || {};
      
      // Count users by their status from userStatuses (admin dashboard state) first, then fallback to user.status
      const pendingApprovals = users.filter(u => {
        const status = (userStatuses[u.id] || u.status || 'pending').toLowerCase();
        return status === 'pending';
      }).length;
      const approvedUsers = users.filter(u => {
        const status = (userStatuses[u.id] || u.status || 'pending').toLowerCase();
        return status === 'approved';
      }).length;
      const suspendedUsers = users.filter(u => {
        const status = (userStatuses[u.id] || u.status || 'pending').toLowerCase();
        return status === 'suspended';
      }).length;

      // Get visitor tracking stats
      const totalViews = getTotalViews();
      const uniqueVisitors = getUniqueVisitors();
      const todayViews = getTodayViews();

      // Update UI
      const totalMsmesEl = document.getElementById('total-msmes');
      const pendingApprovalsEl = document.getElementById('pending-approvals');
      const totalViewsEl = document.getElementById('total-views');
      
      if (totalMsmesEl) totalMsmesEl.textContent = totalUsers;
      if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingApprovals;
      if (totalViewsEl) totalViewsEl.textContent = totalViews.toLocaleString();
      
      // Update other stats if elements exist
      const totalEventsEl = document.getElementById('total-events');
      const totalBulletinsEl = document.getElementById('total-bulletins');
      if (totalEventsEl) totalEventsEl.textContent = '0';
      if (totalBulletinsEl) totalBulletinsEl.textContent = '0';

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  /**
   * Helper method to update user and business status locally
   * This ensures local state is always updated even if backend fails
   */
  async updateUserAndBusinessStatus(userId, businessId, status, isActive) {
    // Validate userId is provided and is a string
    if (!userId || typeof userId !== 'string') {
      console.error('[admin-dashboard] ❌ Invalid userId provided:', userId, typeof userId);
      return false;
    }
    
    console.log('[admin-dashboard] Updating local status:', { userId, businessId, status, isActive });
    
    // 1) Update user status in localStorage (users array) - THIS IS CRITICAL
    const users = getAllUsers();
    console.log('[admin-dashboard] Total users in storage:', users.length);
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      console.log('[admin-dashboard] Found user at index:', userIndex, { 
        id: users[userIndex].id, 
        email: users[userIndex].email, 
        currentStatus: users[userIndex].status 
      });
    }
    
    if (userIndex !== -1) {
      const oldStatus = users[userIndex].status;
      users[userIndex].status = status;
      users[userIndex].updated_at = new Date().toISOString();
      saveUsers(users);
      console.log('[admin-dashboard] ✅ Updated user object in users array:', { 
        userId, 
        userIndex, 
        oldStatus, 
        newStatus: status,
        email: users[userIndex].email 
      });
      
      // Verify the update was saved correctly
      const verifyUsers = getAllUsers();
      const verifyUser = verifyUsers.find(u => u.id === userId);
      if (verifyUser && verifyUser.status !== status) {
        console.error('[admin-dashboard] ❌ STATUS UPDATE FAILED! Expected:', status, 'Got:', verifyUser.status);
      } else {
        console.log('[admin-dashboard] ✅ Status update verified:', verifyUser?.status);
      }
    } else {
      console.warn('[admin-dashboard] Could not find user to update:', userId);
      console.warn('[admin-dashboard] Available user IDs:', users.map(u => u.id));
      // Still continue to update state
    }
    
    // 2) ALSO update admin dashboard state (this is what import script checks!)
    const stateKey = 'chamber_admin_dashboard_state';
    let state = JSON.parse(localStorage.getItem(stateKey) || '{}');
    if (!state.userStatuses) state.userStatuses = {};
    if (!state.userMetadata) state.userMetadata = {};
    if (!state.userMetadata[userId]) state.userMetadata[userId] = {};
    
    const oldStateStatus = state.userStatuses[userId];
    state.userStatuses[userId] = status;
    state.userMetadata[userId].lastStatusUpdate = Date.now();
    
    localStorage.setItem(stateKey, JSON.stringify(state));
    console.log('[admin-dashboard] ✅ Updated admin dashboard state:', { 
      userId, 
      oldStateStatus, 
      newStatus: status, 
      stateKey,
      allUserStatuses: Object.keys(state.userStatuses).length + ' users'
    });
    
    // 3) Re-render the approvals list IMMEDIATELY to update UI
    await this.loadApprovals();
    await this.loadStats();
    
    // Verify the status was updated correctly
    const verifyState = JSON.parse(localStorage.getItem('chamber_admin_dashboard_state') || '{}');
    const verifyStatus = verifyState.userStatuses?.[userId];
    if (verifyStatus !== status) {
      console.error('[admin-dashboard] ❌ Status update verification failed! Expected:', status, 'Got:', verifyStatus);
      // Force reload to ensure UI is in sync
      await this.loadApprovals();
    } else {
      console.log('[admin-dashboard] ✅ Status update verified and UI refreshed');
    }
    
    return true;
  }

  /**
   * Helper method to delete all events and bulletins for a user/business
   * This is called when the admin deletion endpoint fails or is unavailable
   */
  async deleteUserEventsAndBulletins(userId, businessId) {
    const id = businessId ? (typeof businessId === 'object' ? businessId.id : businessId) : null;
    let deletedEvents = 0;
    let deletedBulletins = 0;
    
    // Delete events directly
    try {
      const eventsResponse = await fetch(`http://localhost:4000/api/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.events || [];
        // Match by owner_id, business_id, or businessId
        const userEvents = events.filter(e => 
          e.owner_id === userId || 
          e.business_id === id || 
          e.business_id === businessId ||
          (e.business && (e.business.id === id || e.business.owner_id === userId))
        );
        
        console.log(`[admin-dashboard] Found ${userEvents.length} events to delete for user ${userId}`);
        
        // Delete each event
        for (const event of userEvents) {
          try {
            const deleteEventResponse = await fetch(`http://localhost:4000/api/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
              }
            });
            if (deleteEventResponse.ok) {
              deletedEvents++;
              console.log(`[admin-dashboard] ✅ Deleted event: ${event.id} - ${event.title || 'Untitled'}`);
            } else if (deleteEventResponse.status === 404) {
              console.debug(`[admin-dashboard] Event ${event.id} already deleted or not found`);
            } else {
              console.warn(`[admin-dashboard] Could not delete event ${event.id}: ${deleteEventResponse.status}`);
            }
          } catch (err) {
            console.warn(`[admin-dashboard] Error deleting event ${event.id}:`, err.message);
          }
        }
      } else if (eventsResponse.status === 404) {
        console.debug('[admin-dashboard] Events endpoint not available (404) - skipping event deletion');
      }
    } catch (eventsError) {
      if (eventsError.message?.includes('Failed to fetch') || eventsError.message?.includes('404')) {
        console.debug('[admin-dashboard] Events endpoint not available - skipping event deletion');
      } else {
        console.warn('[admin-dashboard] Could not fetch/delete events:', eventsError.message);
      }
    }
    
    // Delete bulletins directly
    try {
      const bulletinsResponse = await fetch(`http://localhost:4000/api/bulletins`);
      if (bulletinsResponse.ok) {
        const bulletinsData = await bulletinsResponse.json();
        const bulletins = bulletinsData.bulletins || [];
        // Match by owner_id, business_id, or businessId
        const userBulletins = bulletins.filter(b => 
          b.owner_id === userId || 
          b.business_id === id || 
          b.business_id === businessId ||
          (b.business && (b.business.id === id || b.business.owner_id === userId))
        );
        
        console.log(`[admin-dashboard] Found ${userBulletins.length} bulletins to delete for user ${userId}`);
        
        // Delete each bulletin
        for (const bulletin of userBulletins) {
          try {
            const deleteBulletinResponse = await fetch(`http://localhost:4000/api/bulletins/${bulletin.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
              }
            });
            if (deleteBulletinResponse.ok) {
              deletedBulletins++;
              console.log(`[admin-dashboard] ✅ Deleted bulletin: ${bulletin.id} - ${bulletin.title || 'Untitled'}`);
            } else if (deleteBulletinResponse.status === 404) {
              console.debug(`[admin-dashboard] Bulletin ${bulletin.id} already deleted or not found`);
            } else {
              console.warn(`[admin-dashboard] Could not delete bulletin ${bulletin.id}: ${deleteBulletinResponse.status}`);
            }
          } catch (err) {
            console.warn(`[admin-dashboard] Error deleting bulletin ${bulletin.id}:`, err.message);
          }
        }
      } else if (bulletinsResponse.status === 404) {
        console.debug('[admin-dashboard] Bulletins endpoint not available (404) - skipping bulletin deletion');
      }
    } catch (bulletinsError) {
      if (bulletinsError.message?.includes('Failed to fetch') || bulletinsError.message?.includes('404')) {
        console.debug('[admin-dashboard] Bulletins endpoint not available - skipping bulletin deletion');
      } else {
        console.warn('[admin-dashboard] Could not fetch/delete bulletins:', bulletinsError.message);
      }
    }
    
    if (deletedEvents > 0 || deletedBulletins > 0) {
      console.log(`[admin-dashboard] ✅ Deleted ${deletedEvents} events and ${deletedBulletins} bulletins directly`);
    }
    
    return { deletedEvents, deletedBulletins };
  }

  /**
   * Check if any filters are currently active
   */
  areFiltersActive() {
    const searchTerm = document.getElementById('admin-search-input')?.value?.trim() || '';
    const statusFilter = document.getElementById('admin-status-filter')?.value || '';
    return searchTerm !== '' || statusFilter !== '';
  }

  /**
   * Apply search and status filters to the users list
   */
  applyFilters() {
    const searchTerm = document.getElementById('admin-search-input')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('admin-status-filter')?.value || '';
    
    // Get admin dashboard state for status lookup
    const stateKey = 'chamber_admin_dashboard_state';
    const state = JSON.parse(localStorage.getItem(stateKey) || '{}');
    const userStatuses = state.userStatuses || {};
    
    // Filter users based on search and status
    this.filteredUsers = this.allUsers.filter(user => {
      // Search filter: match name, email, or business name
      const matchesSearch = !searchTerm || 
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.business_name && user.business_name.toLowerCase().includes(searchTerm));
      
      // Status filter - check userStatuses first (admin dashboard state), then user.status
      const userStatus = (userStatuses[user.id] || user.status || 'pending').toLowerCase();
      const matchesStatus = !statusFilter || userStatus === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
    
    // Re-render with filtered users (will be sorted in loadApprovals)
    this.loadApprovals();
  }
  
  /**
   * Clear all filters and show all users
   */
  clearFilters() {
    const searchInput = document.getElementById('admin-search-input');
    const statusFilter = document.getElementById('admin-status-filter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    
    // Reset filtered users to show all users
    this.filteredUsers = [...this.allUsers];
    this.loadApprovals();
  }
  
  /**
   * Update the results count display
   */
  updateResultsCount() {
    const resultsCountEl = document.getElementById('admin-results-count');
    if (resultsCountEl) {
      const total = this.allUsers.length;
      const filtered = this.filteredUsers.length;
      if (filtered === total) {
        resultsCountEl.textContent = `Showing ${total} user${total !== 1 ? 's' : ''}`;
      } else {
        resultsCountEl.textContent = `Showing ${filtered} of ${total} user${total !== 1 ? 's' : ''}`;
      }
    }
  }

  async loadApprovals() {
    try {
      const users = getAllUsers();
      const documents = getAllDocuments();
      
      // Store all users for filtering
      this.allUsers = users;

      // Initialize filtered users if not already set AND filters are not active
      // If filters are active but return 0 results, keep the empty array
      const filtersActive = this.areFiltersActive();
      if (this.filteredUsers.length === 0 && !filtersActive) {
        this.filteredUsers = [...users];
      }
      
      // Use filtered users if filters are active, otherwise use all users
      // If filters are active, always use filteredUsers (even if empty)
      const usersToDisplay = filtersActive ? this.filteredUsers : users;
      
      // Get admin dashboard state for status lookup (for sorting)
      const stateKey = 'chamber_admin_dashboard_state';
      const state = JSON.parse(localStorage.getItem(stateKey) || '{}');
      const userStatuses = state.userStatuses || {};
      
      // Sort: pending/rejected/suspended/needs_fix first, then updated, then approved
      const sortedUsers = [...usersToDisplay].sort((a, b) => {
        // Use status from admin dashboard state first, then fallback to user.status
        const statusA = (userStatuses[a.id] || a.status || 'pending').toLowerCase();
        const statusB = (userStatuses[b.id] || b.status || 'pending').toLowerCase();
        // Priority: needs_fix, pending, rejected, suspended = 0; updated = 1; approved = 2
        const priorityA = ['pending', 'rejected', 'suspended', 'needs_fix'].includes(statusA) ? 0 : 
                          statusA === 'updated' ? 1 : 2;
        const priorityB = ['pending', 'rejected', 'suspended', 'needs_fix'].includes(statusB) ? 0 : 
                          statusB === 'updated' ? 1 : 2;
        if (priorityA !== priorityB) return priorityA - priorityB;
        // If same priority, sort by date (newer first)
        return 0;
      });

      console.log('[admin-dashboard] Loading approvals:', {
        totalUsers: users.length,
        filteredUsers: this.filteredUsers.length,
        showingUsers: sortedUsers.length,
        documentsCount: documents.length,
        userStatuses: sortedUsers.map(u => ({ id: u.id, email: u.email, name: u.name, status: u.status || 'pending' }))
      });
      
      // Debug: Log all user statuses
      const statusCounts = {};
      sortedUsers.forEach(u => {
        const status = (u.status || 'pending').toLowerCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('[admin-dashboard] User status breakdown:', statusCounts);

      // Store the sorted users for rendering
      this.sortedUsers = sortedUsers;
      
      // Render the approvals
      this.renderApprovals(sortedUsers);
      
      // Update results count
      this.updateResultsCount();
    } catch (error) {
      console.error('Error loading approvals:', error);
      const container = document.getElementById('approvals-list');
      if (container) {
        container.innerHTML = `<p>Error loading users: ${error.message}</p>`;
      }
    }
  }
  
  /**
   * Render the approvals list with the provided users
   */
  renderApprovals(sortedUsers) {
    const container = document.getElementById('approvals-list');
    if (!container) return;
    
    const documents = getAllDocuments();
    
    if (sortedUsers.length === 0) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6b7280;">No users found matching your filters. Try adjusting your search or status filter.</p>';
      return;
    }

    // Group documents by user_id (also try business_id as fallback)
    const documentsByUser = {};
    documents.forEach(doc => {
      // Try multiple ways to match documents to users
      const userIds = [
        doc.user_id,
        doc.business_id,
        doc.owner_id
      ].filter(Boolean);
      
      userIds.forEach(userId => {
        if (!documentsByUser[userId]) {
          documentsByUser[userId] = [];
        }
        // Avoid duplicates - check by id, or by kind+user_id if no id
        const existing = documentsByUser[userId].find(d => 
          d.id === doc.id || 
          (d.kind === doc.kind && d.user_id === doc.user_id && !d.id && !doc.id)
        );
        if (!existing) {
          documentsByUser[userId].push(doc);
        } else {
          // Update existing if this one has a better URL
          if (doc.file_url && !doc.file_url.startsWith('pending_') && !doc.file_url.startsWith('blob:')) {
            const existingIndex = documentsByUser[userId].indexOf(existing);
            documentsByUser[userId][existingIndex] = doc;
          }
        }
      });
    });

    const docTypes = {
        'civil_id_front': 'Civil ID Front',
        'civil_id_back': 'Civil ID Back',
        'owner_proof': 'Owner Proof',
        'license': 'License',
        'iban': 'IBAN Certificate',
        'articles': 'Articles of Incorporation',
        'signature_auth': 'Signature Authorization'
      };

      // Load admin dashboard state for metadata
      const stateKey = 'chamber_admin_dashboard_state';
      const state = JSON.parse(localStorage.getItem(stateKey) || '{}');
      const userStatuses = state.userStatuses || {};
      const userMetadata = state.userMetadata || {};

      container.innerHTML = sortedUsers.map(user => {
        // Try to match documents by user_id, and also try business_id
        const userDocs = documentsByUser[user.id] || documentsByUser[user.business_id] || [];
        
        // PRIORITY: Always check userStatuses from admin dashboard state FIRST (this is the source of truth for admin actions)
        // Then check user.status from users array, then default to pending
        let status = 'pending';
        if (userStatuses[user.id]) {
          status = userStatuses[user.id];
          console.log(`[admin-dashboard] Using status from userStatuses for ${user.id}: ${status}`);
        } else if (user.status) {
          status = user.status;
          console.log(`[admin-dashboard] Using status from user object for ${user.id}: ${status}`);
        }
        
        // Normalize status to lowercase
        status = status.toLowerCase();
        const meta = userMetadata[user.id] || {};
        
        console.log(`[admin-dashboard] User ${user.id} (${user.email}):`, {
          userDocsCount: userDocs.length,
          userDocs: userDocs.map(d => ({ kind: d.kind, file_name: d.file_name })),
          business_id: user.business_id,
          status: status,
          statusFromState: userStatuses[user.id] || 'none',
          statusFromUser: user.status || 'none',
          metadata: meta
        });
        
        // Determine status label and badge class - be explicit about each status
        let statusLabel = '';
        let statusBadgeClass = '';
        
        switch (status) {
          case 'approved':
            statusLabel = 'APPROVED';
            statusBadgeClass = 'status-approved';
            break;
          case 'suspended':
            statusLabel = 'SUSPENDED';
            statusBadgeClass = 'status-suspended';
            break;
          case 'rejected':
            statusLabel = 'REJECTED';
            statusBadgeClass = 'status-rejected';
            break;
          case 'needs_fix':
            statusLabel = 'NEEDS UPDATE';
            statusBadgeClass = 'status-pending';
            break;
          case 'updated':
            statusLabel = 'UPDATED';
            statusBadgeClass = 'status-approved';
            break;
          case 'pending':
          default:
            statusLabel = 'PENDING';
            statusBadgeClass = 'status-pending';
            break;
        }
        
        console.log(`[admin-dashboard] Status display for ${user.id}:`, {
          rawStatus: status,
          statusLabel,
          statusBadgeClass,
          userStatusFromState: userStatuses[user.id],
          userStatusFromUser: user.status
        });
        
        const lastUpdatedText = meta.documentsUpdatedAt
          ? `Last update: ${new Date(meta.documentsUpdatedAt).toLocaleDateString()}`
          : '';
        
        return `
          <div class="approval-item" data-user-id="${user.id}">
            <div class="approval-info">
              <div class="user-header">
                <h3>${user.business_name || user.name || 'Unnamed Business'}</h3>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                  <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                  ${lastUpdatedText ? `<span style="font-size: 11px; color: #6b7280; margin-top: 2px;">${lastUpdatedText}</span>` : ''}
                </div>
              </div>
              <div class="user-details">
                <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>User ID:</strong> ${user.id}</p>
                <p><strong>Created:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                ${user.industry ? `<p><strong>Industry:</strong> ${user.industry}</p>` : ''}
                ${user.city ? `<p><strong>City:</strong> ${user.city}</p>` : ''}
              </div>
              <div class="documents-section">
                <h4>Documents:</h4>
                <div class="documents-list">
                  ${Object.keys(docTypes).map(docType => {
                    const doc = userDocs.find(d => d.kind === docType);
                    // Convert relative URL to absolute backend URL
                    let docUrl = '#';
                    if (doc && doc.file_url) {
                      docUrl = doc.file_url;
                      if (docUrl && docUrl !== '#') {
                        if (!docUrl.startsWith('http://') && !docUrl.startsWith('https://')) {
                          if (docUrl.startsWith('/uploads/')) {
                            docUrl = `http://localhost:4000${docUrl}`;
                          } else if (!docUrl.startsWith('/')) {
                            docUrl = `http://localhost:4000/uploads/${docUrl}`;
                          } else {
                            docUrl = `http://localhost:4000${docUrl}`;
                          }
                        }
                      }
                    }
                    const isPending = doc && (doc.url_pending || doc.file_url?.startsWith('pending_') || doc.file_url?.startsWith('blob:'));
                    return `
                      <div class="document-item ${doc ? 'uploaded' : 'missing'} ${isPending ? 'pending-url' : ''}">
                        <span class="doc-icon">${doc ? (isPending ? '⏳' : '✓') : '✗'}</span>
                        <span class="doc-name">${docTypes[docType]}</span>
                        ${doc ? `
                          ${!isPending && docUrl && docUrl !== '#' && !docUrl.includes('undefined') ? `
                            <a href="${docUrl}" target="_blank" class="doc-link" onclick="event.preventDefault(); const url = '${docUrl}'; if(url && url !== '#' && !url.includes('undefined')) { window.open(url, '_blank'); } else { alert('Document URL not available'); } return false;">View</a>
                          ` : `
                            <span class="doc-pending" style="color: #f59e0b; font-size: 12px;">${doc.file_name ? `Uploaded: ${doc.file_name}` : 'Uploaded (URL pending)'}</span>
                          `}
                          <button class="btn-small btn-issue" onclick="adminDashboard.showMessageModal('${user.id}', '${docType}')">
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
              <!-- Approve button - show for pending/needs_fix/updated/rejected (not approved/suspended) -->
              ${status !== 'approved' && status !== 'suspended' ? `
                <button class="btn-approve" onclick="adminDashboard.approveAccount('${user.id}')" style="background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
                  <i class="fas fa-check"></i> Approve
                </button>
              ` : ''}
              
              <!-- Unapprove button - show for approved/suspended -->
              ${status === 'approved' || status === 'suspended' ? `
                <button class="btn-unapprove" onclick="adminDashboard.unapproveAccount('${user.id}')" style="background: #f59e0b; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
                  <i class="fas fa-undo"></i> Unapprove
                </button>
              ` : ''}
              
              <!-- Suspend button - show for approved/pending/needs_fix/updated/rejected (not suspended) -->
              ${status !== 'suspended' ? `
                <button class="btn-suspend" onclick="adminDashboard.suspendAccount('${user.id}')" style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
                  <i class="fas fa-ban"></i> Suspend
                </button>
              ` : ''}
              
              <!-- Unsuspend button - show for suspended -->
              ${status === 'suspended' ? `
                <button class="btn-approve" onclick="adminDashboard.unsuspendAccount('${user.id}')" style="background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
                  <i class="fas fa-check"></i> Unsuspend
                </button>
              ` : ''}
              
              <!-- Delete button - always visible -->
              <button class="btn-delete" onclick="adminDashboard.deleteAccount('${user.id}')" style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
                <i class="fas fa-trash"></i> Delete
              </button>
              
              <!-- View Details button - always visible -->
              <button class="btn-view" onclick="adminDashboard.viewUserDetails('${user.id}')" style="background: #667eea; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">
                <i class="fas fa-eye"></i> View Details
              </button>
            </div>
          </div>
        `;
      }).join('');
  }

  async loadTabData(tabName) {
    if (tabName === 'analytics') {
      await this.loadAnalytics();
    }
    switch (tabName) {
      case 'approvals':
        await this.loadApprovals();
        break;
    }
  }

  async approveAccount(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      console.error('[admin-dashboard] ❌ Invalid userId in approveAccount:', userId, typeof userId);
      alert('Error: Invalid user ID. Please refresh the page and try again.');
      return;
    }
    
    // Check current status to prevent duplicate actions
    const state = JSON.parse(localStorage.getItem('chamber_admin_dashboard_state') || '{}');
    const currentStatus = state.userStatuses?.[userId] || getAllUsers().find(u => u.id === userId)?.status || 'pending';
    
    if (currentStatus === 'approved') {
      alert('This account is already approved.');
      await this.loadApprovals(); // Refresh UI
      return;
    }
    
    console.log('[admin-dashboard] approveAccount called for user:', userId, 'current status:', currentStatus);
    if (!confirm('Are you sure you want to approve this account?')) {
      console.log('[admin-dashboard] Approval cancelled by user');
      return;
    }
    
    try {
      // Get user to find their business_id
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        console.error('[admin-dashboard] ❌ User not found in users array:', userId);
        console.error('[admin-dashboard] Available user IDs:', users.map(u => u.id));
        throw new Error(`User not found: ${userId}`);
      }

      console.log('[admin-dashboard] Found user:', { id: user.id, email: user.email, business_id: user.business_id, currentStatus: user.status });

      // Get business ID
      let businessId = user.business_id;
      
      // If no business_id in user data, try to find it by owner_id (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) {
              businessId = business.id;
              console.log('[admin-dashboard] Found business by owner_id:', businessId);
            }
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business by owner_id (standalone mode OK):', err.message);
        }
      }
      
      // Try to update backend (best-effort only - don't block on failure)
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', is_active: true })
          });
          
          if (response.ok) {
            console.log('[admin-dashboard] ✅ Backend status updated successfully');
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - continuing in standalone mode');
          } else {
            console.warn('[admin-dashboard] Backend update failed:', response.status, '- continuing in standalone mode');
          }
        } catch (backendError) {
          // Network error or 404 - that's OK, we're in standalone mode
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available (standalone mode) - updating local state only');
          } else {
            console.warn('[admin-dashboard] Backend update error (continuing anyway):', backendError.message);
          }
        }
      } else {
        console.log('[admin-dashboard] No business ID found - updating local state only');
      }

      // ALWAYS update local state (even if backend failed)
      // This will also call loadApprovals() to refresh the UI
      await this.updateUserAndBusinessStatus(userId, businessId, 'approved', true);

      // Create approval notification message
      const approvalMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: 'admin',
        toUserId: userId,
        user_id: userId,
        subject: 'Account Approved',
        body: 'Congratulations! Your account has been approved.',
        message: 'Congratulations! Your account has been approved.',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        read_at: null,
        status: 'open',
        document_type: null
      };
      
      // Save to inbox messages
      const inboxKey = 'ch122_inbox_messages';
      const allMessages = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      allMessages.push(approvalMessage);
      localStorage.setItem(inboxKey, JSON.stringify(allMessages));
      
      // Also save to admin messages (for compatibility)
      createAdminMessage({
        id: approvalMessage.id,
        user_id: userId,
        subject: 'Account Approved',
        message: approvalMessage.message,
        document_type: null,
        status: 'open',
        created_at: approvalMessage.created_at
      });

      console.log('[admin-dashboard] Approval notification created. User can view it in their inbox.');
      alert('Account approved successfully. The user has been notified.');
    } catch (error) {
      console.error('[admin-dashboard] Error approving account:', error);
      alert('Error approving account: ' + error.message);
    }
  }

  async rejectAccount(userId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      let businessId = user.business_id;
      
      // Find business if not in user data (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) businessId = business.id;
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business (standalone mode OK):', err.message);
        }
      }
      
      // Try to update backend (best-effort only)
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', is_active: false })
          });
          
          if (response.ok) {
            console.log('[admin-dashboard] ✅ Backend status updated successfully');
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - continuing in standalone mode');
          } else {
            console.warn('[admin-dashboard] Backend update failed:', response.status, '- continuing in standalone mode');
          }
        } catch (backendError) {
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available (standalone mode) - updating local state only');
          } else {
            console.warn('[admin-dashboard] Backend update error (continuing anyway):', backendError.message);
          }
        }
      }
      
      // ALWAYS update local state (even if backend failed)
      await this.updateUserAndBusinessStatus(userId, businessId, 'rejected', false);
      
      // Create rejection notification message with reason
      const rejectionMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: 'admin',
        toUserId: userId,
        user_id: userId,
        subject: 'Account Rejected',
        body: `Your account has been rejected.\n\nReason: ${reason}\n\nIf you believe this is an error, please contact support.`,
        message: `Your account has been rejected.\n\nReason: ${reason}\n\nIf you believe this is an error, please contact support.`,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        read_at: null,
        status: 'open',
        document_type: null
      };
      
      // Save to inbox messages
      const inboxKey = 'ch122_inbox_messages';
      const allMessages = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      allMessages.push(rejectionMessage);
      localStorage.setItem(inboxKey, JSON.stringify(allMessages));
      
      // Also save to admin messages (for compatibility)
      createAdminMessage({
        id: rejectionMessage.id,
        user_id: userId,
        subject: 'Account Rejected',
        message: rejectionMessage.message,
        document_type: null,
        status: 'open',
        created_at: rejectionMessage.created_at
      });

      alert('Account rejected and notification sent');
    } catch (error) {
      console.error('[admin-dashboard] Error rejecting account:', error);
      alert('Error rejecting account: ' + error.message);
    }
  }

  async suspendAccount(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      console.error('[admin-dashboard] ❌ Invalid userId in suspendAccount:', userId, typeof userId);
      alert('Error: Invalid user ID. Please refresh the page and try again.');
      return;
    }
    
    // Check current status to prevent duplicate actions
    const state = JSON.parse(localStorage.getItem('chamber_admin_dashboard_state') || '{}');
    const currentStatus = state.userStatuses?.[userId] || getAllUsers().find(u => u.id === userId)?.status || 'pending';
    
    if (currentStatus === 'suspended') {
      alert('This account is already suspended.');
      await this.loadApprovals(); // Refresh UI
      return;
    }
    
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason || reason.trim() === '') {
      alert('Suspension reason is required.');
      return;
    }
    
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        console.error('[admin-dashboard] ❌ User not found in users array:', userId);
        console.error('[admin-dashboard] Available user IDs:', users.map(u => u.id));
        throw new Error(`User not found: ${userId}`);
      }
      
      console.log('[admin-dashboard] Found user to suspend:', { id: user.id, email: user.email, currentStatus: user.status });

      let businessId = user.business_id;
      
      // Find business if not in user data (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) businessId = business.id;
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business (standalone mode OK):', err.message);
        }
      }
      
      // Try to update backend (best-effort only)
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'suspended', is_active: false })
          });
          
          if (response.ok) {
            console.log('[admin-dashboard] ✅ Backend status updated successfully');
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - continuing in standalone mode');
          } else {
            console.warn('[admin-dashboard] Backend update failed:', response.status, '- continuing in standalone mode');
          }
        } catch (backendError) {
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available (standalone mode) - updating local state only');
          } else {
            console.warn('[admin-dashboard] Backend update error (continuing anyway):', backendError.message);
          }
        }
      }
      
      // ALWAYS update local state (even if backend failed)
      // This will also call loadApprovals() to refresh the UI
      await this.updateUserAndBusinessStatus(userId, businessId, 'suspended', false);
      
      // Create suspension notification message with reason
      const suspensionMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: 'admin',
        toUserId: userId,
        user_id: userId,
        subject: 'Account Suspended',
        body: `Your account has been suspended.\n\nReason: ${reason}\n\nPlease contact support if you have any questions or would like to appeal this decision.`,
        message: `Your account has been suspended.\n\nReason: ${reason}\n\nPlease contact support if you have any questions or would like to appeal this decision.`,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        read_at: null,
        status: 'open',
        document_type: null
      };
      
      // Save to inbox messages
      const inboxKey = 'ch122_inbox_messages';
      const allMessages = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      allMessages.push(suspensionMessage);
      localStorage.setItem(inboxKey, JSON.stringify(allMessages));
      
      // Also save to admin messages (for compatibility)
      createAdminMessage({
        id: suspensionMessage.id,
        user_id: userId,
        subject: 'Account Suspended',
        message: suspensionMessage.message,
        document_type: null,
        status: 'open',
        created_at: suspensionMessage.created_at
      });

      console.log('[admin-dashboard] Suspension notification created. User can view it in their inbox.');
      alert('Account suspended successfully. The user has been notified with the reason.');
    } catch (error) {
      console.error('[admin-dashboard] Error suspending account:', error);
      alert('Error suspending account: ' + error.message);
    }
  }

  async unsuspendAccount(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      console.error('[admin-dashboard] ❌ Invalid userId in unsuspendAccount:', userId, typeof userId);
      alert('Error: Invalid user ID. Please refresh the page and try again.');
      return;
    }
    
    if (!confirm('Are you sure you want to unsuspend this account?')) return;
    
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        console.error('[admin-dashboard] ❌ User not found in users array:', userId);
        console.error('[admin-dashboard] Available user IDs:', users.map(u => u.id));
        throw new Error(`User not found: ${userId}`);
      }
      
      console.log('[admin-dashboard] Found user to unsuspend:', { id: user.id, email: user.email, currentStatus: user.status });

      let businessId = user.business_id;
      
      // Find business if not in user data (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) businessId = business.id;
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business (standalone mode OK):', err.message);
        }
      }
      
      // Try to update backend (best-effort only)
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', is_active: true })
          });
          
          if (response.ok) {
            console.log('[admin-dashboard] ✅ Backend status updated successfully');
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - continuing in standalone mode');
          } else {
            console.warn('[admin-dashboard] Backend update failed:', response.status, '- continuing in standalone mode');
          }
        } catch (backendError) {
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available (standalone mode) - updating local state only');
          } else {
            console.warn('[admin-dashboard] Backend update error (continuing anyway):', backendError.message);
          }
        }
      }
      
      // ALWAYS update local state (even if backend failed)
      await this.updateUserAndBusinessStatus(userId, businessId, 'approved', true);
      
      // Create notification message
      createAdminMessage({
        user_id: userId,
        subject: 'Account Unsuspended',
        message: 'Your account has been unsuspended. You can now access all features.',
        document_type: null
      });

      alert('Account unsuspended successfully');
    } catch (error) {
      console.error('[admin-dashboard] Error unsuspending account:', error);
      alert('Error unsuspending account: ' + error.message);
    }
  }

  async unapproveAccount(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      console.error('[admin-dashboard] ❌ Invalid userId in unapproveAccount:', userId, typeof userId);
      alert('Error: Invalid user ID. Please refresh the page and try again.');
      return;
    }
    
    if (!confirm('Are you sure you want to unapprove this account? It will be set back to pending status.')) return;
    
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        console.error('[admin-dashboard] ❌ User not found in users array:', userId);
        console.error('[admin-dashboard] Available user IDs:', users.map(u => u.id));
        throw new Error(`User not found: ${userId}`);
      }
      
      console.log('[admin-dashboard] Found user to unapprove:', { id: user.id, email: user.email, currentStatus: user.status });

      let businessId = user.business_id;
      
      // Find business if not in user data (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) businessId = business.id;
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business (standalone mode OK):', err.message);
        }
      }
      
      // Try to update backend (best-effort only)
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending', is_active: false })
          });
          
          if (response.ok) {
            console.log('[admin-dashboard] ✅ Backend status updated successfully');
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - continuing in standalone mode');
          } else {
            console.warn('[admin-dashboard] Backend update failed:', response.status, '- continuing in standalone mode');
          }
        } catch (backendError) {
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available (standalone mode) - updating local state only');
          } else {
            console.warn('[admin-dashboard] Backend update error (continuing anyway):', backendError.message);
          }
        }
      }
      
      // ALWAYS update local state (even if backend failed)
      await this.updateUserAndBusinessStatus(userId, businessId, 'pending', false);
      
      // Create notification message
      createAdminMessage({
        user_id: userId,
        subject: 'Account Unapproved',
        message: 'Your account has been unapproved and set back to pending status. Please wait for review.',
        document_type: null
      });

      alert('Account unapproved successfully. Status set to pending.');
    } catch (error) {
      console.error('[admin-dashboard] Error unapproving account:', error);
      alert('Error unapproving account: ' + error.message);
    }
  }

  async deleteAccount(userId) {
    const user = getUserById(userId);
    const userName = user?.name || user?.email || 'this account';
    
    if (!confirm(`Are you sure you want to DELETE "${userName}"?\n\nThis action cannot be undone. ALL data will be permanently removed:\n- User account\n- Business profile\n- All documents\n- All events\n- All bulletins\n- All messages\n- All uploaded files`)) {
      return;
    }
    
    // Double confirmation for safety
    if (!confirm(`FINAL CONFIRMATION: Delete "${userName}" permanently?\n\nThis will COMPLETELY remove:\n- User account from database\n- Business profile\n- All documents and files\n- All events and registrations\n- All bulletins and registrations\n- All messages and conversations\n- All uploaded files from server\n\nThis action is IRREVERSIBLE.`)) {
      return;
    }
    
    try {
      let businessId = user?.business_id;
      
      // If no business_id in user data, try to find it by owner_id (best-effort only)
      if (!businessId) {
        try {
          const businessResponse = await fetch(`/api/businesses/public`);
          if (businessResponse.ok) {
            const businessesData = await businessResponse.json();
            const businesses = businessesData.businesses || businessesData || [];
            const business = businesses.find(b => b.owner_id === userId);
            if (business) {
              businessId = business.id;
              console.log('[admin-dashboard] Found business by owner_id:', businessId);
            }
          }
        } catch (err) {
          console.debug('[admin-dashboard] Could not find business by owner_id (standalone mode OK):', err.message);
        }
      }
      
      // Try to delete from backend (best-effort only)
      let backendDeletionSuccess = false;
      let deletionResult = null;
      if (businessId) {
        const id = typeof businessId === 'object' ? businessId.id : businessId;
        try {
          const response = await fetch(`/api/businesses/${id}/admin`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            deletionResult = await response.json();
            console.log('[admin-dashboard] ✅ Backend deletion successful:', deletionResult);
            backendDeletionSuccess = true;
            
            // Verify events and bulletins were deleted (check the deletion result)
            const deletedEvents = deletionResult.deleted?.events || 0;
            const deletedBulletins = deletionResult.deleted?.bulletins || 0;
            console.log(`[admin-dashboard] Backend reports: ${deletedEvents} events and ${deletedBulletins} bulletins deleted`);
            
            // If backend says it deleted events/bulletins, we're good
            // But if it says 0, we should try direct deletion as a safety measure
            if (deletedEvents === 0 && deletedBulletins === 0) {
              console.log('[admin-dashboard] Backend reports 0 events/bulletins deleted - attempting direct deletion to be safe...');
              await this.deleteUserEventsAndBulletins(userId, businessId);
            }
          } else if (response.status === 404) {
            console.warn('[admin-dashboard] Backend admin endpoint not available (404) - will delete events/bulletins directly');
          } else {
            console.warn('[admin-dashboard] Backend deletion failed:', response.status, '- will delete events/bulletins directly');
          }
        } catch (backendError) {
          if (backendError.status === 404 || backendError.message?.includes('404') || backendError.message?.includes('Failed to fetch')) {
            console.warn('[admin-dashboard] Backend not available - will delete events/bulletins directly if possible');
          } else {
            console.warn('[admin-dashboard] Backend deletion error (continuing anyway):', backendError.message);
          }
        }
      }
      
      // If backend deletion failed or wasn't available, try to delete events and bulletins directly
      // This ensures events/bulletins are deleted even if the admin endpoint doesn't work
      if (!backendDeletionSuccess) {
        console.log('[admin-dashboard] Backend admin deletion not successful, attempting direct deletion of events/bulletins...');
        await this.deleteUserEventsAndBulletins(userId, businessId);
      }
      
      // ALWAYS delete from localStorage (even if backend failed)
      console.log('[admin-dashboard] Deleting from localStorage...');
      deleteUser(userId);
      
      // Also delete any admin messages for this user
      const { getAdminMessages, saveAdminMessages } = await import('./admin-auth.js');
      const messages = getAdminMessages();
      const filteredMessages = messages.filter(m => m.user_id !== userId);
      saveAdminMessages(filteredMessages);
      console.log('[admin-dashboard] Deleted admin messages for user');
      
      // Re-render the UI
      await this.loadApprovals();
      await this.loadStats();
      
      const deletionSummary = [];
      if (backendDeletionSuccess && deletionResult) {
        const deleted = deletionResult.deleted || {};
        const summary = [
          `✅ Backend deletion successful:`,
          `- ${deleted.events || 0} events deleted`,
          `- ${deleted.bulletins || 0} bulletins deleted`,
          `- ${deleted.messages || 0} messages deleted`,
          `- ${deleted.media || 0} media files deleted`,
          `- Business and user account deleted`
        ];
        deletionSummary.push(...summary);
      } else if (businessId) {
        deletionSummary.push('⚠️ Backend deletion attempted (may have failed - events/bulletins deleted directly if found)');
      } else {
        deletionSummary.push('⚠️ No business ID found - deleted from local storage only');
      }
      
      alert(`✅ Account "${userName}" has been deleted from the admin dashboard.\n\n${deletionSummary.join('\n')}\n\nPlease refresh the events and bulletins pages to see the changes.`);
    } catch (error) {
      console.error('[admin-dashboard] Error deleting account:', error);
      alert('Error deleting account: ' + error.message);
    }
  }

  showMessageModal(userId, documentType) {
    const DOC_TYPE_LABELS = {
      'civil_id_front': 'Civil ID Front',
      'civil_id_back': 'Civil ID Back',
      'owner_proof': 'Owner Proof',
      'license': 'Business License',
      'iban': 'IBAN document',
      'articles': 'Articles of Association',
      'signature_auth': 'Signature Authorization'
    };

    const docTypeLabel = DOC_TYPE_LABELS[documentType] || documentType;
    const subject = prompt(`Enter subject for message about ${docTypeLabel}:`, `Issue with ${docTypeLabel}`);
    if (!subject) return;

    const defaultMessage = `The ${docTypeLabel} document you submitted has an issue. Please review and resubmit it by going to your profile edit page and uploading a new file for this document.`;
    const message = prompt(`Enter message to send to user about ${docTypeLabel}:`, defaultMessage);
    if (!message) return;

    this.reportDocumentIssue(userId, documentType, message, subject, docTypeLabel);
  }

  async reportDocumentIssue(userId, docType, messageText, subject, docTypeLabel) {
    try {
      const DOC_TYPE_LABELS = {
        'civil_id_front': 'Civil ID Front',
        'civil_id_back': 'Civil ID Back',
        'owner_proof': 'Owner Proof',
        'license': 'Business License',
        'iban': 'IBAN document',
        'articles': 'Articles of Association',
        'signature_auth': 'Signature Authorization'
      };

      // Use provided docTypeLabel or fall back to mapping
      const label = docTypeLabel || DOC_TYPE_LABELS[docType] || docType;
      const defaultMessage = messageText || `The ${label} document you submitted has an issue. Please review and resubmit it by going to your profile edit page and uploading a new file for this document.`;
      const messageSubject = subject || `Issue with ${label}`;

      // Create message with action payload
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const message = {
        id: messageId,
        from: 'admin',
        toUserId: userId,
        user_id: userId, // Also include for compatibility with existing structure
        subject: messageSubject,
        body: defaultMessage,
        message: defaultMessage, // Also include for compatibility
        createdAt: timestamp,
        created_at: timestamp, // Also include for compatibility
        unread: true,
        read_at: null,
        status: 'open',
        document_type: docType,
        action: {
          type: 'fix_document',
          docType: docType,
          redirectUrl: '/owner-form.html#documents'
        }
      };
      
      console.log('[admin-dashboard] Creating message for user:', {
        userId,
        messageId,
        toUserId: message.toUserId,
        user_id: message.user_id,
        from: message.from,
        subject: messageSubject,
        docType
      });

      // Save to localStorage inbox messages
      const inboxKey = 'ch122_inbox_messages';
      const allMessages = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      allMessages.push(message);
      localStorage.setItem(inboxKey, JSON.stringify(allMessages));
      console.log('[admin-dashboard] Message saved to inbox:', {
        messageId,
        userId,
        toUserId: message.toUserId,
        user_id: message.user_id,
        from: message.from,
        subject: messageSubject,
        totalMessages: allMessages.length
      });
      
      // Verify the message was saved correctly
      const verifyMessages = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      const savedMessage = verifyMessages.find(m => m.id === messageId);
      if (!savedMessage) {
        console.error('[admin-dashboard] ❌ Message was not saved correctly!');
      } else {
        console.log('[admin-dashboard] ✅ Message verified in storage:', {
          id: savedMessage.id,
          toUserId: savedMessage.toUserId,
          user_id: savedMessage.user_id,
          from: savedMessage.from
        });
      }

      // Also save to admin messages (for compatibility with existing structure)
      createAdminMessage({
        id: messageId,
        user_id: userId,
        subject: messageSubject,
        message: defaultMessage,
        document_type: docType,
        status: 'open',
        created_at: message.created_at,
        action: message.action
      });

      // Update user status to "needs_fix"
      this.updateUserStatusToNeedsFix(userId);

      // Re-render approvals list
      await this.loadApprovals();

      alert('Issue reported successfully. The user will see this message in their inbox with a "Fix this document" button.');
    } catch (error) {
      console.error('[admin-dashboard] Error reporting document issue:', error);
      alert('Error reporting issue: ' + error.message);
    }
  }

  /**
   * Update user status to "needs_fix" and persist to admin dashboard state
   */
  updateUserStatusToNeedsFix(userId) {
    // Update user status in main users storage
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].status = 'needs_fix';
      users[userIndex].updated_at = new Date().toISOString();
      saveUsers(users);
    }

    // Also update admin dashboard state
    const stateKey = 'chamber_admin_dashboard_state';
    let state = JSON.parse(localStorage.getItem(stateKey) || '{}');
    
    if (!state.userStatuses) state.userStatuses = {};
    if (!state.userMetadata) state.userMetadata = {};
    if (!state.userMetadata[userId]) state.userMetadata[userId] = {};
    
    state.userStatuses[userId] = 'needs_fix';
    state.userMetadata[userId].needsFixAt = Date.now();
    
    localStorage.setItem(stateKey, JSON.stringify(state));
    console.log('[admin-dashboard] User status updated to needs_fix:', userId);
  }

  async sendMessageToUser(userId, subject, message, documentType) {
    // Legacy method - redirect to new reportDocumentIssue
    this.reportDocumentIssue(userId, documentType, message, subject);
  }

  async viewUserDetails(userId) {
    const { getUserById, getDocumentsByUserId } = await import('./admin-auth.js');
    const user = getUserById(userId);
    const documents = getDocumentsByUserId(userId);
    const messages = getAdminMessages().filter(m => m.user_id === userId);

    const details = `
User Details:
- Name: ${user?.name || 'N/A'}
- Email: ${user?.email || 'N/A'}
- Phone: ${user?.phone || 'N/A'}
- Business: ${user?.business_name || 'N/A'}
- Status: ${user?.status || 'N/A'}
- Documents: ${documents.length}
- Messages: ${messages.length}
    `;

    alert(details);
  }

  async importFromAPI() {
    const btn = event?.target || document.querySelector('[onclick*="importFromAPI"]');
    const originalText = btn?.innerHTML || '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
    }
    
    try {
      const { importBusinessesFromAPI } = await import('./admin-import-data.js');
      const result = await importBusinessesFromAPI();
      
      alert(`Import completed!\n- Imported: ${result.imported} new users\n- Updated: ${result.updated} existing users\n- Total: ${result.total} users`);
      
      // Refresh the dashboard
      await this.loadDashboardData();
    } catch (error) {
      console.error('[admin-dashboard] Import error:', error);
      const errorMsg = error.code === 'NO_BUSINESSES' 
        ? 'No businesses found in the database.\n\nTo start the backend server:\n1. Open a terminal\n2. Run: cd server && node index.js\n3. Then try importing again.'
        : 'Import failed: ' + error.message + '\n\nMake sure the backend server is running:\ncd server && node index.js';
      alert(errorMsg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText || '<i class="fas fa-download"></i> Import from API';
      }
    }
  }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();

// Export for global access
window.adminDashboard = adminDashboard;

