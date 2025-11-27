// js/admin.js - Admin Dashboard (localStorage only, no backend, no Supabase)
import {
  getCurrentUser,
  getAllUsers,
  getAllBusinesses,
  saveUsers,
  saveBusinesses,
  updateUser,
  updateBusiness,
  isAdmin,
  logout,
  generateId
} from './auth-localstorage.js';

// Ensure admin account exists (exported for use in admin.html)
export function ensureAdminAccount() {
  const users = getAllUsers();
  let admin = users.find(u => u.role === 'admin');
  
  if (!admin) {
    const adminUser = {
      id: generateId(),
      email: 'admin@123123.com',
      password: '12345678',
      role: 'admin',
      status: 'approved',
      created_at: new Date().toISOString()
    };
    users.push(adminUser);
    saveUsers(users);
    console.log('[admin] Auto-created admin account: admin@123123.com / 12345678');
    } else {
    // Update existing admin credentials
    const adminIndex = users.findIndex(u => u.id === admin.id);
    if (adminIndex !== -1) {
      users[adminIndex].email = 'admin@123123.com';
      users[adminIndex].password = '12345678';
      saveUsers(users);
      console.log('[admin] Updated admin account credentials: admin@123123.com / 12345678');
    }
  }
}

// Check admin access and redirect if not admin
function checkAdminAccess() {
  const user = getCurrentUser();
  if (!user) {
    // Not logged in - let the login form show (handled by admin.html)
    return false;
  }
  if (!isAdmin()) {
    // Logged in but not admin - logout and show login form
    console.log('[admin] User is logged in but not an admin, logging out...');
    logout();
    // Don't show alert - just let the login form appear
    return false;
  }
  return true;
}

// Admin Dashboard Object
const adminDashboard = {
  currentSection: 'users',
  
  init() {
    console.log('[admin] ========== INITIALIZING ADMIN DASHBOARD ==========');
    // Ensure admin account exists
    ensureAdminAccount();
    
    // Check admin access
    if (!checkAdminAccess()) {
      console.log('[admin] Access denied - not an admin');
      return;
    }
    
    console.log('[admin] Admin access confirmed');
    
    // Setup navigation
    this.setupNavigation();
    
    // Setup search and filters
    this.setupSearchAndFilters();
    
    // Load initial section immediately and with delay
    this.loadSection('users');
    setTimeout(() => {
      console.log('[admin] Reloading users after delay...');
      this.loadSection('users');
    }, 500);
  },
  
  setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        this.switchSection(section);
      });
    });
  },
  
  switchSection(section) {
    // Update nav
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.classList.remove('active');
    });
    document.getElementById(`section-${section}`).classList.add('active');
    
    this.currentSection = section;
    this.loadSection(section);
  },
  
  loadSection(section) {
    console.log('[admin] Loading section:', section);
    this.currentSection = section;
    switch(section) {
      case 'users':
        console.log('[admin] Calling loadUsers()...');
        try {
          this.loadUsers();
          console.log('[admin] loadUsers() completed');
  } catch (error) {
          console.error('[admin] Error in loadUsers():', error);
        }
        break;
      case 'msmes':
        this.loadMSMEs();
        break;
      case 'events':
        this.loadEvents();
        break;
      case 'bulletins':
        this.loadBulletins();
        break;
      case 'messages':
        this.loadMessages();
        break;
      case 'communities':
        this.loadCommunities();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  },
  
  // Users Management
  async loadUsers() {
    try {
      console.log('[admin] ========== LOADING USERS ==========');
      let allUsers = getAllUsers();
      console.log('[admin] Found users in localStorage:', allUsers.length);
      
      // Get container
      const container = document.getElementById('users-container');
      if (!container) {
        console.error('[admin] Users container not found');
        return;
      }
      
      // Show loading state
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>';
      
      // Force reload from localStorage
      const rawStorage = localStorage.getItem('chamber122_users');
      if (rawStorage) {
        try {
          allUsers = JSON.parse(rawStorage);
          console.log('[admin] Reloaded users from localStorage:', allUsers.length);
        } catch (e) {
          console.error('[admin] Error parsing users:', e);
        }
      }
      
      // Filter out admin from stats but show in list
      const users = allUsers; // Show all users including admin
      const nonAdminUsers = users.filter(u => u.role !== 'admin');
      
      // Update stats (exclude admin from counts)
      const total = nonAdminUsers.length;
      const pending = nonAdminUsers.filter(u => (u.status || 'pending') === 'pending').length;
      const approved = nonAdminUsers.filter(u => (u.status || 'pending') === 'approved').length;
      const suspended = nonAdminUsers.filter(u => (u.status || 'pending') === 'suspended').length;
      
      const statTotal = document.getElementById('stat-total-users');
      const statPending = document.getElementById('stat-pending-users');
      const statApproved = document.getElementById('stat-approved-users');
      const statSuspended = document.getElementById('stat-suspended-users');
      
      if (statTotal) statTotal.textContent = total;
      if (statPending) statPending.textContent = pending;
      if (statApproved) statApproved.textContent = approved;
      if (statSuspended) statSuspended.textContent = suspended;
    
    // Apply search and filter
    const searchTerm = (document.getElementById('users-search')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('users-filter')?.value || 'all';
    
    let filteredUsers = users;
    
    // Apply search filter
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(u => 
        u.email.toLowerCase().includes(searchTerm) ||
        (u.name && u.name.toLowerCase().includes(searchTerm)) ||
        (u.business_name && u.business_name.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filteredUsers = filteredUsers.filter(u => (u.status || 'pending') === filterStatus);
    }
    
    console.log('[admin] Filtered users:', filteredUsers.length);
    
    // Render users in card format with all details (matching the design shown)
    if (filteredUsers.length === 0) {
      const hasSearchOrFilter = searchTerm || filterStatus !== 'all';
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #6b7280;">
          ${hasSearchOrFilter ? 
            '<p style="font-size: 16px; margin-bottom: 12px;">No users match your search criteria.</p><button onclick="document.getElementById(\'users-search\').value=\'\'; document.getElementById(\'users-filter\').value=\'all\'; adminDashboard.loadUsers();" style="margin-top: 12px; padding: 8px 16px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Clear Filters</button>' :
            '<p style="font-size: 16px; margin-bottom: 8px;">No users found.</p><p style="font-size: 14px; color: #9ca3af; margin-top: 8px;">New accounts will appear here automatically when users sign up.</p>'
          }
        </div>
      `;
      console.log('[admin] No users to display');
      return;
    }
    
    const businesses = getAllBusinesses();
    const allDocuments = JSON.parse(localStorage.getItem('chamber122_documents') || '[]');
    
    container.innerHTML = filteredUsers.map(user => {
      const business = businesses.find(b => b.owner_id === user.id);
      const statusClass = user.status === 'approved' ? 'status-approved' : 
                         user.status === 'suspended' ? 'status-suspended' : 'status-pending';
      const statusText = user.status || 'pending';
      const roleBadge = user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '';
      const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
      const updatedDate = user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A';
      
      // Get user documents
      const userDocs = allDocuments.filter(d => 
        (d.user_id === user.id || d.userId === user.id)
      );
      
      // Get documents from signup data
      const signupData = JSON.parse(localStorage.getItem(`chamber122_signup_data_${user.id}`) || localStorage.getItem('chamber122_signup_data') || '{}');
      const signupDocs = signupData.documents || {};
      
      // Combine all document types
      const allDocTypes = ['civil_id_front', 'civil_id_back', 'owner_proof', 'license', 'iban', 'articles', 'signature_auth'];
      const hasDocuments = userDocs.length > 0 || Object.keys(signupDocs).length > 0;
      
      return `
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${user.name || user.email || 'No name'}</h3>
                ${roleBadge}
                <span class="status-badge ${statusClass}">${statusText}</span>
                ${statusText === 'pending' ? '<span style="background: #f59e0b; color: #111; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">NEEDS UPDATE</span>' : ''}
              </div>
              <div style="color: #4b5563; font-size: 14px; line-height: 2;">
                <div><strong style="color: #1a1a1a;">Name:</strong> ${user.name || user.email || 'N/A'}</div>
                <div><strong style="color: #1a1a1a;">Email:</strong> ${user.email || 'N/A'}</div>
                ${user.phone ? `<div><strong style="color: #1a1a1a;">Phone:</strong> ${user.phone}</div>` : ''}
                <div><strong style="color: #1a1a1a;">User ID:</strong> <span style="font-family: monospace; font-size: 12px;">${user.id}</span></div>
                <div><strong style="color: #1a1a1a;">Created:</strong> ${createdDate}</div>
                ${user.industry ? `<div><strong style="color: #1a1a1a;">Industry:</strong> ${user.industry}</div>` : ''}
                ${user.city ? `<div><strong style="color: #1a1a1a;">City:</strong> ${user.city}</div>` : ''}
                ${business ? `<div><strong style="color: #1a1a1a;">Business:</strong> ${business.name || business.business_name || 'N/A'}</div>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: start;">
              ${user.role !== 'admin' && user.status !== 'approved' ? `<button onclick="adminDashboard.approveUser('${user.id}')" class="btn-action btn-approve" title="Approve" style="padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; background: #10b981; color: #fff; font-size: 14px; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>` : ''}
              ${user.role !== 'admin' && user.status !== 'suspended' ? `<button onclick="adminDashboard.suspendUser('${user.id}')" class="btn-action btn-suspend" title="Suspend" style="padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; background: #ef4444; color: #fff; font-size: 14px; font-weight: 600;"><i class="fas fa-ban"></i> Suspend</button>` : ''}
              ${user.role !== 'admin' ? `<button onclick="adminDashboard.viewUserDocuments('${user.id}', '${user.email}')" class="btn-action btn-view" title="View Documents" style="padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; background: #3b82f6; color: #fff; font-size: 14px; font-weight: 600;"><i class="fas fa-eye"></i> View Details</button>` : ''}
              ${user.role !== 'admin' ? `<button onclick="adminDashboard.deleteUser('${user.id}')" class="btn-action btn-delete" title="Delete" style="padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; background: #dc2626; color: #fff; font-size: 14px; font-weight: 600;"><i class="fas fa-trash"></i> Delete</button>` : ''}
            </div>
          </div>
          
          ${hasDocuments ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h4 style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin-bottom: 12px;">Documents:</h4>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${allDocTypes.map(docType => {
                  const doc = userDocs.find(d => (d.kind || d.type || d.docType) === docType) || 
                             (signupDocs[docType] ? { 
                               kind: docType, 
                               file_url: signupDocs[docType].url || signupDocs[docType].base64 || signupDocs[docType].file_url || '', 
                               url: signupDocs[docType].url || signupDocs[docType].base64 || signupDocs[docType].file_url || '',
                               base64: signupDocs[docType].base64 || signupDocs[docType].url || signupDocs[docType].file_url || '',
                               file_name: signupDocs[docType].name || `${docType}.pdf` 
                             } : null);
                  if (!doc) return '';
                  
                  // Check all possible URL fields - prioritize base64 data URLs
                  let docUrl = doc.base64 || doc.file_url || doc.url || doc.public_url || doc.fileUrl || '';
                  
                  // If we have signup docs, check for base64 there too
                  if (!docUrl && signupDocs[docType]) {
                    docUrl = signupDocs[docType].base64 || signupDocs[docType].url || signupDocs[docType].file_url || '';
                  }
                  
                  // Validate URL - must be base64 data URL, HTTP URL, or valid file path
                  const hasValidUrl = docUrl && docUrl.trim() && 
                                     docUrl !== 'undefined' && 
                                     !docUrl.startsWith('pending_') && 
                                     !docUrl.startsWith('blob:') &&
                                     (docUrl.startsWith('data:') || 
                                      docUrl.startsWith('http://') || 
                                      docUrl.startsWith('https://') ||
                                      (docUrl.length > 100 && docUrl.includes('base64')));
                  
                  // For onclick, we need to escape properly and handle long base64 strings
                  // Store in a data attribute instead of inline onclick for long URLs
                  const docId = `doc_${user.id}_${docType}`;
                  const safeDocType = docType.replace(/'/g, "\\'");
                  
                  // Store document URL in a data attribute to avoid issues with long base64 strings
                  if (hasValidUrl && docUrl.length > 500) {
                    // For very long URLs (base64), store in window object
                    if (!window.adminDocCache) window.adminDocCache = {};
                    window.adminDocCache[docId] = docUrl;
                  }
                  
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 18px;"></i>
                        <span style="color: #1a1a1a; font-weight: 500; text-transform: capitalize;">${docType.replace(/_/g, ' ')}</span>
                      </div>
                      <div style="display: flex; gap: 8px;">
                        ${hasValidUrl ? 
                          (docUrl.length > 500 ? 
                            `<button onclick="adminDashboard.viewDocumentFromCache('${user.id}', '${safeDocType}', '${docId}')" style="color: #3b82f6; background: none; border: none; cursor: pointer; font-weight: 600; padding: 4px 8px;">View</button>` :
                            `<button onclick="adminDashboard.viewDocument('${user.id}', '${safeDocType}', ${JSON.stringify(docUrl)})" style="color: #3b82f6; background: none; border: none; cursor: pointer; font-weight: 600; padding: 4px 8px;">View</button>`
                          ) : 
                          '<span style="color: #6b7280; font-size: 12px;">Pending</span>'
                        }
                        <button onclick="adminDashboard.reportDocument('${user.id}', '${user.email}', '${safeDocType}')" style="background: #f59e0b; color: #fff; border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-weight: 600; font-size: 12px;">Report Issue</button>
                      </div>
                    </div>
                  `;
                }).filter(html => html).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    console.log('[admin] Users rendered successfully');
  } catch (error) {
      console.error('[admin] Error loading users:', error);
      const container = document.getElementById('users-container');
      if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;">Error loading users: ${error.message}</div>`;
      }
    }
  },
  
  async approveUser(userId) {
    if (!confirm('Approve this user?')) return;
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        alert('User not found');
        return;
      }
      
      updateUser(userId, { status: 'approved', updated_at: new Date().toISOString() });
      
      // Send approval message to user
      await this.sendStatusMessage(userId, user.email, 'approved', 'Your account has been approved! You can now access all features.');
      
      // Also approve their business if exists
      const businesses = getAllBusinesses();
      const userBusiness = businesses.find(b => b.owner_id === userId);
      if (userBusiness) {
        updateBusiness(userBusiness.id, { status: 'approved', is_published: true, updated_at: new Date().toISOString() });
      }
      
      // Reload users to show updated status
      await this.loadUsers();
      
      alert('User approved successfully! They have been notified in their inbox.');
    } catch (error) {
      console.error('[admin] Error approving user:', error);
      alert('Error approving user: ' + error.message);
    }
  },
  
  async suspendUser(userId) {
    if (!confirm('Suspend this user?')) return;
    try {
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        alert('User not found');
        return;
      }
      
      updateUser(userId, { status: 'suspended', updated_at: new Date().toISOString() });
      
      // Send suspension message to user
      await this.sendStatusMessage(userId, user.email, 'suspended', 'Your account has been suspended. Please contact support for more information.');
      
      // Also suspend their business if exists
      const businesses = getAllBusinesses();
      const userBusiness = businesses.find(b => b.owner_id === userId);
      if (userBusiness) {
        updateBusiness(userBusiness.id, { status: 'suspended', is_published: false, updated_at: new Date().toISOString() });
      }
      
      // Reload users to show updated status
      await this.loadUsers();
      
      alert('User suspended successfully! They have been notified in their inbox.');
  } catch (error) {
      console.error('[admin] Error suspending user:', error);
      alert('Error suspending user: ' + error.message);
    }
  },
  
  sendStatusMessage(userId, userEmail, status, message) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('[admin] Cannot send status message - no current user');
      return;
    }
    
    // Send to inbox messages
    const inboxMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
    const statusMessage = {
      id: generateId(),
      from: 'admin',
      fromUserId: currentUser.id,
      toUserId: userId,
      user_id: userId,
      subject: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: message,
      created_at: new Date().toISOString(),
      unread: true,
      read_at: null
    };
    
    inboxMessages.push(statusMessage);
    localStorage.setItem('ch122_inbox_messages', JSON.stringify(inboxMessages));
    
    // Also send to user messages for inbox compatibility
    const userMessages = JSON.parse(localStorage.getItem('ch122_user_messages') || '[]');
    userMessages.push({
      id: statusMessage.id,
      fromUserId: currentUser.id,
      fromUserEmail: currentUser.email,
      fromUserName: 'Admin',
      toUserId: userId,
      toUserEmail: userEmail,
      toUserName: userEmail,
      subject: statusMessage.subject,
      body: statusMessage.body,
      created_at: statusMessage.created_at,
      read_at: null,
      unread: true
    });
    localStorage.setItem('ch122_user_messages', JSON.stringify(userMessages));
    
    console.log('[admin] Status message sent to user:', userId, status);
    
    // Dispatch event to update inbox badge
    window.dispatchEvent(new CustomEvent('inbox-updated'));
  },
  
  deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const users = getAllUsers();
      const filtered = users.filter(u => u.id !== userId);
      saveUsers(filtered);
      
      // Also delete user's business
      const businesses = getAllBusinesses();
      const userBusiness = businesses.find(b => b.owner_id === userId);
      if (userBusiness) {
        const filteredBusinesses = businesses.filter(b => b.id !== userBusiness.id);
        saveBusinesses(filteredBusinesses);
      }
      
      // Reload users
      this.loadUsers();
      
      alert('User deleted successfully!');
  } catch (error) {
      console.error('[admin] Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    }
  },
  
  // MSMEs Management
  loadMSMEs() {
    const businesses = getAllBusinesses();
    const users = getAllUsers();
    const tbody = document.getElementById('msmes-table-body');
    
    // Update stats
    const total = businesses.length;
    const pending = businesses.filter(b => b.status === 'pending').length;
    const approved = businesses.filter(b => b.status === 'approved').length;
    
    document.getElementById('stat-total-msmes').textContent = total;
    document.getElementById('stat-pending-msmes').textContent = pending;
    document.getElementById('stat-approved-msmes').textContent = approved;
    
    // Render MSMEs
    if (businesses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No MSMEs found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = businesses.map(business => {
      const owner = users.find(u => u.id === business.owner_id);
      const statusClass = business.status === 'approved' ? 'status-approved' : 
                         business.status === 'suspended' ? 'status-suspended' : 'status-pending';
      const createdDate = business.created_at ? new Date(business.created_at).toLocaleDateString() : 'N/A';
      
      return `
        <tr>
          <td>${business.name || business.business_name || 'N/A'}</td>
          <td>${owner ? owner.email : 'N/A'}</td>
          <td>${business.industry || business.category || 'N/A'}</td>
          <td><span class="status-badge ${statusClass}">${business.status || 'pending'}</span></td>
          <td>${createdDate}</td>
          <td class="actions-cell">
            ${business.status !== 'approved' ? `<button onclick="adminDashboard.approveMSME('${business.id}')" class="btn-action btn-approve" title="Approve"><i class="fas fa-check"></i></button>` : ''}
            ${business.status !== 'suspended' ? `<button onclick="adminDashboard.suspendMSME('${business.id}')" class="btn-action btn-suspend" title="Suspend"><i class="fas fa-ban"></i></button>` : ''}
            <button onclick="adminDashboard.viewMSME('${business.id}')" class="btn-action btn-view" title="View"><i class="fas fa-eye"></i></button>
            ${owner ? `<button onclick="adminDashboard.sendMessageToUser('${owner.id}', '${owner.email}')" class="btn-action btn-message" title="Send Message"><i class="fas fa-envelope"></i></button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },
  
  approveMSME(businessId) {
    if (!confirm('Approve this MSME?')) return;
    const businesses = getAllBusinesses();
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    
    updateBusiness(businessId, { status: 'approved', is_published: true });
    
    // Also approve the owner user
    const users = getAllUsers();
    const owner = users.find(u => u.id === business.owner_id);
    if (owner && owner.status !== 'approved') {
      updateUser(owner.id, { status: 'approved' });
      this.sendStatusMessage(owner.id, owner.email, 'approved', 'Your MSME profile has been approved! Your business is now visible to the public.');
    }
    
    this.loadMSMEs();
  },
  
  suspendMSME(businessId) {
    if (!confirm('Suspend this MSME?')) return;
    const businesses = getAllBusinesses();
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    
    updateBusiness(businessId, { status: 'suspended', is_published: false });
    
    // Also suspend the owner user
    const users = getAllUsers();
    const owner = users.find(u => u.id === business.owner_id);
    if (owner && owner.status !== 'suspended') {
      updateUser(owner.id, { status: 'suspended' });
      this.sendStatusMessage(owner.id, owner.email, 'suspended', 'Your MSME profile has been suspended. Please contact support for more information.');
    }
    
    this.loadMSMEs();
  },
  
  viewMSME(businessId) {
    window.location.href = `/owner.html?businessId=${businessId}`;
  },
  
  // Events Management
  async loadEvents() {
    try {
      const { getPublicEvents } = await import('./api.js');
      const events = await getPublicEvents();
      const allEvents = JSON.parse(localStorage.getItem('chamber122_events') || '[]');
      const businesses = getAllBusinesses();
      const tbody = document.getElementById('events-table-body');
      
      // Update stats
      const total = allEvents.length;
      const pending = allEvents.filter(e => e.status === 'pending').length;
      const published = allEvents.filter(e => e.status === 'published' && e.is_published).length;
      
      document.getElementById('stat-total-events').textContent = total;
      document.getElementById('stat-pending-events').textContent = pending;
      document.getElementById('stat-published-events').textContent = published;
      
      // Render events
      if (allEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No events found.</td></tr>';
        return;
      }
      
      tbody.innerHTML = allEvents.map(event => {
        const business = businesses.find(b => b.id === event.business_id || b.owner_id === event.owner_id);
        const statusClass = event.status === 'published' && event.is_published ? 'status-approved' : 
                          event.status === 'pending' ? 'status-pending' : 'status-draft';
        const statusText = event.status === 'published' && event.is_published ? 'published' : (event.status || 'draft');
        const startDate = event.start_at ? new Date(event.start_at).toLocaleDateString() : 'N/A';
        const createdDate = event.created_at ? new Date(event.created_at).toLocaleDateString() : 'N/A';
        
        return `
          <tr>
            <td>${event.title || 'Untitled Event'}</td>
            <td>${business ? (business.name || business.business_name) : 'N/A'}</td>
            <td>${startDate}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${createdDate}</td>
            <td class="actions-cell">
              ${event.status !== 'published' ? `<button onclick="adminDashboard.approveEvent('${event.id}')" class="btn-action btn-approve" title="Approve"><i class="fas fa-check"></i></button>` : ''}
              ${event.status === 'published' ? `<button onclick="adminDashboard.rejectEvent('${event.id}')" class="btn-action btn-suspend" title="Reject"><i class="fas fa-times"></i></button>` : ''}
              <button onclick="adminDashboard.deleteEvent('${event.id}')" class="btn-action btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('[admin] Error loading events:', err);
    }
  },
  
  async approveEvent(eventId) {
    if (!confirm('Approve this event?')) return;
    try {
      const { updateEventStatus } = await import('./api.js');
      await updateEventStatus(eventId, 'published');
      this.loadEvents();
    } catch (err) {
      alert('Error approving event: ' + err.message);
    }
  },
  
  async rejectEvent(eventId) {
    if (!confirm('Reject this event?')) return;
    try {
      const { updateEventStatus } = await import('./api.js');
      await updateEventStatus(eventId, 'pending');
      this.loadEvents();
    } catch (err) {
      alert('Error rejecting event: ' + err.message);
    }
  },
  
  async deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const { deleteEventById } = await import('./api.js');
      await deleteEventById(eventId);
      this.loadEvents();
    } catch (err) {
      alert('Error deleting event: ' + err.message);
    }
  },
  
  // Bulletins Management
  async loadBulletins() {
    try {
      const stored = localStorage.getItem('chamber122_bulletins');
      let bulletins = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          bulletins = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (e) {
          console.error('[admin] Error parsing bulletins:', e);
        }
      }
      
      const businesses = getAllBusinesses();
      const tbody = document.getElementById('bulletins-table-body');
      
      // Update stats
      const total = bulletins.length;
      const pending = bulletins.filter(b => b.status === 'pending').length;
      const published = bulletins.filter(b => b.status === 'published' && b.is_published).length;
      
      document.getElementById('stat-total-bulletins').textContent = total;
      document.getElementById('stat-pending-bulletins').textContent = pending;
      document.getElementById('stat-published-bulletins').textContent = published;
      
      // Render bulletins
      if (bulletins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No bulletins found.</td></tr>';
    return;
  }
  
      tbody.innerHTML = bulletins.map(bulletin => {
        const business = businesses.find(b => b.id === bulletin.business_id || b.owner_id === bulletin.owner_id);
        const statusClass = bulletin.status === 'published' && bulletin.is_published ? 'status-approved' : 
                           bulletin.status === 'pending' ? 'status-pending' : 'status-draft';
        const statusText = bulletin.status === 'published' && bulletin.is_published ? 'published' : (bulletin.status || 'draft');
        const deadline = bulletin.deadline_date || bulletin.end_at || bulletin.end_date || 'N/A';
        const deadlineDate = deadline !== 'N/A' ? new Date(deadline).toLocaleDateString() : 'N/A';
        const createdDate = bulletin.created_at ? new Date(bulletin.created_at).toLocaleDateString() : 'N/A';
        
        return `
          <tr>
            <td>${bulletin.title || 'Untitled Bulletin'}</td>
            <td>${business ? (business.name || business.business_name) : 'N/A'}</td>
            <td>${deadlineDate}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${createdDate}</td>
            <td class="actions-cell">
              ${bulletin.status !== 'published' ? `<button onclick="adminDashboard.approveBulletin('${bulletin.id}')" class="btn-action btn-approve" title="Approve"><i class="fas fa-check"></i></button>` : ''}
              ${bulletin.status === 'published' ? `<button onclick="adminDashboard.rejectBulletin('${bulletin.id}')" class="btn-action btn-suspend" title="Reject"><i class="fas fa-times"></i></button>` : ''}
              <button onclick="adminDashboard.deleteBulletin('${bulletin.id}')" class="btn-action btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('[admin] Error loading bulletins:', err);
    }
  },
  
  async approveBulletin(bulletinId) {
    if (!confirm('Approve this bulletin?')) return;
    try {
      const { updateBulletinStatus } = await import('./api.js');
      await updateBulletinStatus(bulletinId, 'published');
      this.loadBulletins();
    } catch (err) {
      alert('Error approving bulletin: ' + err.message);
    }
  },
  
  async rejectBulletin(bulletinId) {
    if (!confirm('Reject this bulletin?')) return;
    try {
      const { updateBulletinStatus } = await import('./api.js');
      await updateBulletinStatus(bulletinId, 'pending');
      this.loadBulletins();
    } catch (err) {
      alert('Error rejecting bulletin: ' + err.message);
    }
  },
  
  async deleteBulletin(bulletinId) {
    if (!confirm('Are you sure you want to delete this bulletin?')) return;
    try {
      const { deleteBulletinById } = await import('./api.js');
      await deleteBulletinById(bulletinId);
      this.loadBulletins();
    } catch (err) {
      alert('Error deleting bulletin: ' + err.message);
    }
  },
  
  // Messages Management
  loadMessages() {
    const tbody = document.getElementById('messages-table-body');
    
    // Load admin messages
    const adminMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
    
    // Load user-to-user messages
    const userMessages = JSON.parse(localStorage.getItem('ch122_user_messages') || '[]');
    
    const allMessages = [...adminMessages, ...userMessages];
    const users = getAllUsers();
    
    if (allMessages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">No messages found.</td></tr>';
    return;
  }
  
    tbody.innerHTML = allMessages.map(msg => {
      const fromUser = users.find(u => u.id === (msg.fromUserId || msg.user_id));
      const toUser = users.find(u => u.id === (msg.toUserId || msg.user_id));
      const fromName = msg.from === 'admin' ? 'Admin' : (fromUser ? fromUser.email : 'Unknown');
      const toName = toUser ? toUser.email : 'Unknown';
      const date = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A';
      
      return `
        <tr>
          <td>${fromName}</td>
          <td>${toName}</td>
          <td>${msg.subject || msg.body?.substring(0, 50) || 'No subject'}</td>
          <td>${date}</td>
          <td class="actions-cell">
            <button onclick="adminDashboard.viewMessage('${msg.id}')" class="btn-action btn-view" title="View"><i class="fas fa-eye"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },
  
  viewMessage(messageId) {
    // Open inbox with message
    window.location.href = `/inbox.html`;
  },
  
  // Communities Management
  async loadCommunities() {
    try {
      const container = document.getElementById('communities-container');
      if (!container) {
        console.error('[admin] Communities container not found');
        return;
      }

      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;"><i class="fas fa-spinner fa-spin"></i> Loading communities...</div>';

      // Import communities API
      const CommunitiesAPI = await import('./communities.api.js');
      
      // Get all communities (including suspended for admin)
      const data = await CommunitiesAPI.getCommunities({ include_suspended: true });
      const communities = data.communities || [];
      
      const businesses = getAllBusinesses();
      const users = getAllUsers();
      
      // Update stats
      const total = communities.length;
      const active = communities.filter(c => c.status === 'active').length;
      const suspended = communities.filter(c => c.status === 'suspended').length;
      
      document.getElementById('stat-total-communities').textContent = total;
      document.getElementById('stat-active-communities').textContent = active;
      document.getElementById('stat-suspended-communities').textContent = suspended;
      
      // Apply filters
      const searchTerm = document.getElementById('communities-search')?.value.toLowerCase() || '';
      const statusFilter = document.getElementById('communities-filter')?.value || 'all';
      
      let filtered = communities;
      
      if (searchTerm) {
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(searchTerm) ||
          (c.description || '').toLowerCase().includes(searchTerm) ||
          c.category.toLowerCase().includes(searchTerm)
        );
      }
      
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }
      
      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No communities found.</div>';
        return;
      }
      
      // Render communities
      container.innerHTML = filtered.map(comm => {
        const creatorBusiness = businesses.find(b => b.id === comm.creator_msme_id || b.owner_id === comm.creator_msme_id);
        const creatorUser = users.find(u => u.id === comm.creator_msme_id);
        const creatorName = creatorBusiness ? (creatorBusiness.name || creatorBusiness.business_name) : 
                          (creatorUser ? creatorUser.email : 'Unknown');
        const createdDate = comm.created_at ? new Date(comm.created_at).toLocaleDateString() : 'N/A';
        const memberCount = comm.member_count || 0;
        const statusClass = comm.status === 'active' ? 'status-approved' : 'status-suspended';
        
        return `
          <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
              <div style="flex: 1;">
                <h3 style="color: #fff; font-size: 1.2rem; margin: 0 0 8px 0;">${this.escapeHtml(comm.name)}</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
                  <span style="padding: 4px 12px; background: #2a2a2a; color: #a8a8a8; border-radius: 6px; font-size: 12px;">${this.escapeHtml(comm.category)}</span>
                  <span class="status-badge ${statusClass}">${comm.status}</span>
                </div>
                ${comm.description ? `<p style="color: #a8a8a8; font-size: 14px; margin: 12px 0; line-height: 1.6;">${this.escapeHtml(comm.description.substring(0, 150))}${comm.description.length > 150 ? '...' : ''}</p>` : ''}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #2a2a2a; font-size: 14px; color: #6b7280;">
              <div><strong>Creator:</strong> ${this.escapeHtml(creatorName)}</div>
              <div><strong>Members:</strong> ${memberCount}</div>
              <div><strong>Created:</strong> ${createdDate}</div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #2a2a2a;">
              <button onclick="adminDashboard.viewCommunity('${comm.id}')" style="padding: 8px 16px; background: #0095f6; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">
                <i class="fas fa-eye"></i> View Details
      </button>
              ${comm.status === 'active' ? `
                <button onclick="adminDashboard.suspendCommunity('${comm.id}')" style="padding: 8px 16px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">
                  <i class="fas fa-ban"></i> Suspend
      </button>
              ` : `
                <button onclick="adminDashboard.activateCommunity('${comm.id}')" style="padding: 8px 16px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">
                  <i class="fas fa-check"></i> Activate
                </button>
              `}
            </div>
    </div>
  `;
      }).join('');
      
    } catch (error) {
      console.error('[admin] Error loading communities:', error);
      const container = document.getElementById('communities-container');
      if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;">Error loading communities: ${error.message}</div>`;
      }
    }
  },
  
  async viewCommunity(communityId) {
    try {
      // Import communities API
      const CommunitiesAPI = await import('./communities.api.js');
      const community = await CommunitiesAPI.getCommunity(communityId);
      
      // Get members and messages
      const members = JSON.parse(localStorage.getItem('chamber122_community_members') || '[]');
      const messages = JSON.parse(localStorage.getItem('chamber122_community_messages') || '[]');
      
      const communityMembers = members.filter(m => m.community_id === communityId && m.status === 'active');
      const communityMessages = messages
        .filter(m => m.community_id === communityId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20); // Last 20 messages
      
      const businesses = getAllBusinesses();
      const users = getAllUsers();
      
      // Create modal with details
      const modalHTML = `
        <div id="community-detail-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
          <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="padding: 24px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #1a1a1a; z-index: 1;">
              <h2 style="color: #fff; margin: 0; font-size: 1.5rem;">${this.escapeHtml(community.name)}</h2>
              <button onclick="document.getElementById('community-detail-modal').remove()" style="background: none; border: none; color: #a8a8a8; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">&times;</button>
            </div>
            <div style="padding: 24px;">
              <div style="margin-bottom: 24px;">
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
                  <span style="padding: 6px 12px; background: #2a2a2a; color: #a8a8a8; border-radius: 6px; font-size: 14px;">${this.escapeHtml(community.category)}</span>
                  <span class="status-badge ${community.status === 'active' ? 'status-approved' : 'status-suspended'}">${community.status}</span>
                </div>
                ${community.description ? `<p style="color: #a8a8a8; font-size: 14px; line-height: 1.6; margin: 12px 0;">${this.escapeHtml(community.description)}</p>` : ''}
                <div style="color: #6b7280; font-size: 14px; margin-top: 12px;">
                  <div><strong>Created:</strong> ${new Date(community.created_at).toLocaleString()}</div>
                  <div><strong>Members:</strong> ${communityMembers.length}</div>
                </div>
      </div>
      
              <div style="margin-bottom: 24px;">
                <h3 style="color: #fff; font-size: 1.1rem; margin-bottom: 16px;">Members (${communityMembers.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                  ${communityMembers.length === 0 ? '<p style="color: #6b7280; text-align: center; padding: 20px;">No members yet</p>' : ''}
                  ${communityMembers.map(m => {
                    const business = businesses.find(b => b.id === m.msme_id || b.owner_id === m.msme_id);
                    const user = users.find(u => u.id === m.msme_id);
                    const name = business ? (business.name || business.business_name) : (user ? user.email : 'Unknown');
                    return `
                      <div style="padding: 12px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <div style="color: #fff; font-weight: 500;">${this.escapeHtml(name)}</div>
                          <div style="color: #6b7280; font-size: 12px;">${m.role === 'owner' ? 'Owner' : 'Member'}</div>
      </div>
                        ${m.role !== 'owner' ? `<button onclick="adminDashboard.removeMember('${communityId}', '${m.msme_id}')" style="padding: 6px 12px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Remove</button>` : ''}
    </div>
  `;
                  }).join('')}
                </div>
              </div>
              
              <div>
                <h3 style="color: #fff; font-size: 1.1rem; margin-bottom: 16px;">Recent Messages (${communityMessages.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; padding: 16px; background: #0f0f0f; border-radius: 8px;">
                  ${communityMessages.length === 0 ? '<p style="color: #6b7280; text-align: center; padding: 20px;">No messages yet</p>' : ''}
                  ${communityMessages.map(msg => {
                    const time = new Date(msg.created_at).toLocaleString();
                    return `
                      <div style="padding: 12px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px;">
                        <div style="color: #fff; font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(msg.msme_name || 'Unknown')}</div>
                        <div style="color: #a8a8a8; font-size: 14px; margin-bottom: 4px;">${this.escapeHtml(msg.body)}</div>
                        <div style="color: #6b7280; font-size: 12px;">${time}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
      console.error('[admin] Error viewing community:', error);
      alert('Error loading community details: ' + error.message);
    }
  },
  
  async removeMember(communityId, msmeId) {
    if (!confirm('Remove this member from the community?')) return;
    
    try {
      const CommunitiesAPI = await import('./communities.api.js');
      await CommunitiesAPI.leaveCommunity(communityId, msmeId);
      alert('Member removed successfully');
      this.viewCommunity(communityId); // Reload view
    } catch (error) {
      console.error('[admin] Error removing member:', error);
      alert('Error removing member: ' + error.message);
    }
  },
  
  async suspendCommunity(communityId) {
    if (!confirm('Are you sure you want to suspend this community? Members will not be able to send messages.')) return;
    
    try {
      const user = getCurrentUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }
      
      const CommunitiesAPI = await import('./communities.api.js');
      await CommunitiesAPI.updateCommunityStatus(communityId, 'suspended', user.id);
      
      alert('Community suspended successfully');
      this.loadCommunities();
    } catch (error) {
      console.error('[admin] Error suspending community:', error);
      alert('Error suspending community: ' + error.message);
    }
  },
  
  async activateCommunity(communityId) {
    if (!confirm('Activate this community?')) return;
    
    try {
      const user = getCurrentUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }
      
      const CommunitiesAPI = await import('./communities.api.js');
      await CommunitiesAPI.updateCommunityStatus(communityId, 'active', user.id);
      
      alert('Community activated successfully');
      this.loadCommunities();
  } catch (error) {
      console.error('[admin] Error activating community:', error);
      alert('Error activating community: ' + error.message);
    }
  },
  
  // Helper function
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  sendMessageToUser(userId, userEmail) {
    const subject = prompt('Enter message subject:');
    if (!subject) return;
    
    const body = prompt('Enter message body:');
    if (!body) return;
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // Save admin message
    const inboxMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
    const message = {
      id: generateId(),
      from: 'admin',
      fromUserId: currentUser.id,
      toUserId: userId,
      user_id: userId,
      subject: subject,
      body: body,
      created_at: new Date().toISOString(),
      unread: true,
      read_at: null
    };
    
    inboxMessages.push(message);
    localStorage.setItem('ch122_inbox_messages', JSON.stringify(inboxMessages));
    
    alert('Message sent successfully!');
    this.loadMessages();
  },
  
  // Documents Management
  loadDocuments() {
    const tbody = document.getElementById('documents-table-body');
    const users = getAllUsers();
    const businesses = getAllBusinesses();
    
    // Check if filtering by user
    const filter = window.adminDocumentFilter || null;
    
    // Collect all documents from users and businesses
    const allDocuments = [];
    
    // Load documents from chamber122_documents storage
    const allStoredDocs = JSON.parse(localStorage.getItem('chamber122_documents') || '[]');
    
    users.forEach(user => {
      // Skip if filtering by user
      if (filter && filter.userId && user.id !== filter.userId) return;
      
      const business = businesses.find(b => b.owner_id === user.id);
      const businessName = business ? (business.name || business.business_name) : 'N/A';
      
      // Get documents for this user from stored documents (include pending URLs)
      const userStoredDocs = allStoredDocs.filter(d => 
        (d.user_id === user.id || d.userId === user.id)
      );
      
      userStoredDocs.forEach(doc => {
        allDocuments.push({
          userId: user.id,
          userEmail: user.email,
          businessId: business ? business.id : null,
          businessName: businessName,
          type: doc.kind || doc.type || 'Unknown',
          kind: doc.kind || doc.type || 'Unknown',
          docType: doc.kind || doc.type || 'Unknown',
          url: doc.file_url || doc.url || doc.public_url || '',
          public_url: doc.public_url || doc.file_url || doc.url || '',
          file_url: doc.file_url || doc.url || doc.public_url || '',
          file_name: doc.file_name || doc.name || '',
          uploaded_at: doc.uploaded_at || doc.created_at || user.created_at,
          created_at: doc.created_at || doc.uploaded_at || user.created_at,
          status: doc.status || 'pending'
        });
      });
      
      // Check for documents in signup data (base64 encoded)
      const signupData = JSON.parse(localStorage.getItem(`chamber122_signup_data_${user.id}`) || localStorage.getItem('chamber122_signup_data') || '{}');
      if (signupData.documents) {
        Object.entries(signupData.documents).forEach(([docType, docData]) => {
          if (docData && (docData.url || docData.base64 || docData.signedUrl)) {
            let docUrl = docData.base64 || docData.url || docData.signedUrl || docData.public_url || '';
            
            allDocuments.push({
              userId: user.id,
              userEmail: user.email,
              businessId: business ? business.id : null,
              businessName: businessName,
              type: docType,
              kind: docType,
              docType: docType,
              url: docUrl,
              public_url: docUrl,
              file_url: docUrl,
              file_name: docData.name || `${docType}.pdf`,
              uploaded_at: docData.uploaded_at || docData.created_at || user.created_at,
              created_at: docData.created_at || docData.uploaded_at || user.created_at,
              status: docData.status || 'pending'
            });
          }
        });
      }
      
      // Check for documents in business data
      if (business && business.documents) {
        if (Array.isArray(business.documents)) {
          business.documents.forEach(doc => {
            allDocuments.push({
              userId: user.id,
              userEmail: user.email,
              businessId: business.id,
              businessName: businessName,
              type: doc.type || doc.kind || 'Unknown',
              kind: doc.kind || doc.type || 'Unknown',
              docType: doc.docType || doc.type || doc.kind || 'Unknown',
              url: doc.url || doc.public_url || doc.file_url || '',
              public_url: doc.public_url || doc.url || doc.file_url || '',
              file_url: doc.file_url || doc.url || doc.public_url || '',
              file_name: doc.file_name || doc.name || '',
              uploaded_at: doc.uploaded_at || doc.created_at || business.created_at,
              created_at: doc.created_at || doc.uploaded_at || business.created_at,
              status: doc.status || 'pending'
            });
          });
        }
      }
    });
    
    // Show filter message if filtering
    if (filter && filter.userId) {
      const filterMsg = document.getElementById('documents-filter-message');
      if (filterMsg) {
        filterMsg.textContent = `Showing documents for: ${filter.userEmail}`;
        filterMsg.style.display = 'block';
      }
    } else {
      const filterMsg = document.getElementById('documents-filter-message');
      if (filterMsg) {
        filterMsg.style.display = 'none';
      }
    }
    
    if (allDocuments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No documents found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = allDocuments.map((doc, index) => {
      const docType = doc.type || doc.kind || doc.docType || 'Unknown';
      const uploadedDate = doc.uploaded_at || doc.created_at || 'N/A';
      const date = uploadedDate !== 'N/A' ? new Date(uploadedDate).toLocaleDateString() : 'N/A';
      const status = doc.status || 'pending';
      const statusClass = status === 'approved' ? 'status-approved' : 
                         status === 'rejected' ? 'status-suspended' : 'status-pending';
      const docUrl = doc.url || doc.public_url || doc.file_url || doc.base64 || '';
      const docId = `doc_${doc.userId}_${index}`;
      
      return `
        <tr>
          <td>${doc.userEmail}</td>
          <td>${doc.businessName}</td>
          <td>${docType}</td>
          <td>${date}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td class="actions-cell">
            ${docUrl && !docUrl.startsWith('pending_') ? `<button onclick="adminDashboard.viewDocument('${doc.userId}', '${docType.replace(/'/g, "\\'")}', '${docUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" class="btn-action btn-view" title="View Document"><i class="fas fa-eye"></i></button>` : '<span style="color: #6b7280; font-size: 12px;">No URL</span>'}
            <button onclick="adminDashboard.reportDocument('${doc.userId}', '${doc.userEmail}', '${docType}')" class="btn-action btn-suspend" title="Report Issue"><i class="fas fa-flag"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },
  
  viewDocument(userId, docType, docUrl) {
    if (!docUrl || docUrl === 'undefined' || docUrl.startsWith('pending_')) {
      alert('Document URL not available yet. The document is still being processed.');
      return;
    }
    
    // Handle base64 data URLs (they can be very long)
    let cleanUrl = docUrl;
    if (typeof docUrl === 'string') {
      // If it's already a string, use it directly
      cleanUrl = docUrl;
    } else if (docUrl && docUrl.toString) {
      cleanUrl = docUrl.toString();
    }
    
    this.showDocumentModal(docType, cleanUrl);
  },
  
  viewDocumentFromCache(userId, docType, docDataId) {
    if (!window.adminDocCache || !window.adminDocCache[docDataId]) {
      alert('Document not found.');
      return;
    }
    const docUrl = window.adminDocCache[docDataId];
    this.showDocumentModal(docType, docUrl);
  },
  
  showDocumentModal(docType, docUrl) {
    // Create modal to view document
    const modal = document.createElement('div');
    modal.id = 'document-viewer-modal';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    
    // Ensure docUrl is a string and handle different formats
    let urlString = String(docUrl || '').trim();
    
    // If it's a blob URL or invalid file path, try to get the actual data
    if (urlString.startsWith('blob:') || (urlString.startsWith('/') && !urlString.startsWith('//'))) {
      console.warn('[admin] Invalid document URL format:', urlString);
      alert('Document URL is not accessible. The document may need to be re-uploaded.');
      return;
    }
    
    // Check if it's a base64 data URL
    const isBase64 = urlString.startsWith('data:');
    
    // Determine if it's an image or PDF
    const isImage = urlString.startsWith('data:image') || 
                   urlString.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                   (isBase64 && urlString.includes('image'));
    const isPDF = urlString.match(/\.pdf$/i) || 
                  urlString.includes('application/pdf') || 
                  (isBase64 && urlString.includes('pdf'));
    
    // Escape HTML in docType
    const safeDocType = String(docType || 'Document').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // For base64 data URLs, use them directly
    // For HTTP URLs, use them as-is
    // Don't try to load local file paths
    const canDisplay = isBase64 || urlString.startsWith('http://') || urlString.startsWith('https://');
    
    modal.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; max-width: 90%; max-height: 90%; overflow: auto; position: relative;">
        <div style="padding: 20px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff;">${safeDocType}</h3>
          <button id="close-doc-modal" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
        <div style="padding: 20px;">
          ${!canDisplay ? 
            `<div style="padding: 40px; text-align: center; color: #ef4444;">
              <p style="margin-bottom: 16px;">Document URL is not accessible.</p>
              <p style="color: #6b7280; font-size: 14px;">The document may need to be re-uploaded by the user.</p>
            </div>` :
            isImage ? 
            `<img src="${urlString}" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;" onerror="this.parentElement.innerHTML='<div style=\\'padding: 40px; text-align: center; color: #6b7280;\\'><p>Failed to load image.</p><p style=\\'font-size: 12px; margin-top: 8px;\\'>The document may be corrupted or in an unsupported format.</p></div>'" />` :
            isPDF ?
            `<iframe src="${urlString}" style="width: 100%; min-height: 600px; border: none; border-radius: 8px;" onerror="this.parentElement.innerHTML='<div style=\\'padding: 40px; text-align: center; color: #6b7280;\\'><p>Failed to load PDF.</p><p style=\\'font-size: 12px; margin-top: 8px;\\'>Try opening in a new tab instead.</p><a href=\\'${urlString.replace(/'/g, '\\&#39;')}\\' target=\\'_blank\\' style=\\'color: #f2c64b; text-decoration: underline; margin-top: 12px; display: inline-block;\\'>Open in new tab</a></div>'"></iframe>
            <div style="margin-top: 12px; text-align: center;">
              <a href="${urlString}" target="_blank" style="color: #f2c64b; text-decoration: underline; font-size: 14px;">Open PDF in new tab</a>
            </div>` :
            `<div style="padding: 40px; text-align: center; color: #6b7280;">
              <p>Document preview not available for this file type.</p>
              <a href="${urlString}" target="_blank" style="color: #f2c64b; text-decoration: underline; margin-top: 12px; display: inline-block;">Download or open in new tab</a>
            </div>`
          }
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close button handler
    document.getElementById('close-doc-modal').onclick = () => modal.remove();
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Close on Escape key
    const closeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', closeHandler);
      }
    };
    document.addEventListener('keydown', closeHandler);
  },
  
  reportDocument(userId, userEmail, docType) {
    // Create modal for custom message input
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="color: #fff; margin: 0; font-size: 20px;">Report Document Issue</h3>
          <button id="close-report-modal" style="background: none; border: none; color: #a8a8a8; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">&times;</button>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="color: #a8a8a8; margin: 0 0 8px 0; font-size: 14px;"><strong>User:</strong> ${userEmail}</p>
          <p style="color: #a8a8a8; margin: 0; font-size: 14px;"><strong>Document:</strong> ${docType.replace(/_/g, ' ')}</p>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: #fff; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Issue Description *</label>
          <textarea id="report-issue-text" placeholder="Describe the issue with this document. The user will receive this message in their inbox..." rows="6" style="width: 100%; padding: 12px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-report" style="padding: 10px 20px; background: #2a2a2a; border: 1px solid #3a3a3a; color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">Cancel</button>
          <button id="send-report" style="padding: 10px 24px; background: #f59e0b; color: #111; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">Send Report</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    document.getElementById('close-report-modal').onclick = closeModal;
    document.getElementById('cancel-report').onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
    
    document.getElementById('send-report').onclick = () => {
      const issueText = document.getElementById('report-issue-text').value.trim();
      if (!issueText) {
        alert('Please describe the issue.');
        return;
      }
      
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('You must be logged in to send reports.');
        closeModal();
        return;
      }
      
      // Send report message to user with fix action
      const inboxMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
      const reportMessage = {
        id: generateId(),
        from: 'admin',
        fromUserId: currentUser.id,
        toUserId: userId,
        user_id: userId,
        subject: `Document Issue: ${docType.replace(/_/g, ' ')}`,
        body: `We found an issue with your ${docType.replace(/_/g, ' ')} document:\n\n${issueText}\n\nPlease update your document in your profile.`,
        created_at: new Date().toISOString(),
        unread: true,
        read_at: null,
        action: {
          type: 'fix_document',
          docType: docType,
          redirectUrl: '/owner-form.html#documents'
        }
      };
      
      inboxMessages.push(reportMessage);
      localStorage.setItem('ch122_inbox_messages', JSON.stringify(inboxMessages));
      
      // Also save to user messages for inbox compatibility
      const userMessages = JSON.parse(localStorage.getItem('ch122_user_messages') || '[]');
      userMessages.push({
        id: reportMessage.id,
        fromUserId: currentUser.id,
        fromUserEmail: currentUser.email,
        fromUserName: 'Admin',
        toUserId: userId,
        toUserEmail: userEmail,
        toUserName: userEmail,
        subject: reportMessage.subject,
        body: reportMessage.body,
        created_at: reportMessage.created_at,
        read_at: null,
        unread: true,
        action: reportMessage.action // Include action for button
      });
      localStorage.setItem('ch122_user_messages', JSON.stringify(userMessages));
      
      // Dispatch event to update inbox badge
      window.dispatchEvent(new CustomEvent('inbox-updated'));
      
      alert('Report sent to user! They will receive this message in their inbox with a link to fix the document.');
      closeModal();
      // Reload users to refresh document display
      if (this.currentSection === 'users') {
        this.loadUsers();
      }
    };
  },
  
  // Settings
  loadSettings() {
    const users = getAllUsers();
    const businesses = getAllBusinesses();
    const events = JSON.parse(localStorage.getItem('chamber122_events') || '[]');
    const bulletins = JSON.parse(localStorage.getItem('chamber122_bulletins') || '[]');
    
    document.getElementById('settings-total-users').textContent = users.length;
    document.getElementById('settings-total-msmes').textContent = businesses.length;
    document.getElementById('settings-total-events').textContent = events.length;
    document.getElementById('settings-total-bulletins').textContent = bulletins.length;
    
    // Load website analytics
    this.loadAnalytics();
  },
  
  loadAnalytics() {
    // Get website visit count
    const visitCount = parseInt(localStorage.getItem('chamber122_visit_count') || '0');
    const uniqueVisitors = JSON.parse(localStorage.getItem('chamber122_unique_visitors') || '[]');
    
    // Display analytics
    const analyticsContainer = document.querySelector('.admin-settings');
    if (analyticsContainer && !document.getElementById('analytics-card')) {
      const analyticsCard = document.createElement('div');
      analyticsCard.id = 'analytics-card';
      analyticsCard.className = 'settings-card';
      analyticsCard.innerHTML = `
        <h3>Website Analytics</h3>
        <div class="settings-item">
          <label>Total Page Views:</label>
          <span id="analytics-visits">${visitCount}</span>
        </div>
        <div class="settings-item">
          <label>Unique Visitors:</label>
          <span id="analytics-unique">${uniqueVisitors.length}</span>
        </div>
        <div class="settings-item">
          <label>Last Updated:</label>
          <span>${new Date().toLocaleString()}</span>
        </div>
      `;
      analyticsContainer.appendChild(analyticsCard);
    } else if (document.getElementById('analytics-visits')) {
      document.getElementById('analytics-visits').textContent = visitCount;
      document.getElementById('analytics-unique').textContent = uniqueVisitors.length;
    }
  },
  
  // Search and Filters
  setupSearchAndFilters() {
    // Users search
    const usersSearch = document.getElementById('users-search');
    if (usersSearch) {
      usersSearch.addEventListener('input', () => this.filterUsers());
    }
    const usersFilter = document.getElementById('users-filter');
    if (usersFilter) {
      usersFilter.addEventListener('change', () => this.filterUsers());
    }
    
    // Communities search and filter
    const communitiesSearch = document.getElementById('communities-search');
    if (communitiesSearch) {
      communitiesSearch.addEventListener('input', () => this.loadCommunities());
    }
    const communitiesFilter = document.getElementById('communities-filter');
    if (communitiesFilter) {
      communitiesFilter.addEventListener('change', () => this.loadCommunities());
    }
    
    // Similar for other sections...
  },
  
  filterUsers() {
    // Reload users with current search/filter values
    this.loadUsers();
  },
  
  // View all documents for a specific user
  viewUserDocuments(userId, userEmail) {
    // Scroll to the user's card in the users section
    const userCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (userCard) {
      userCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the card briefly
      userCard.style.transition = 'box-shadow 0.3s';
      userCard.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        userCard.style.boxShadow = '';
      }, 2000);
    }
  },
  
  // Export Data
  exportData() {
    const data = {
      users: getAllUsers(),
      businesses: getAllBusinesses(),
      events: JSON.parse(localStorage.getItem('chamber122_events') || '[]'),
      bulletins: JSON.parse(localStorage.getItem('chamber122_bulletins') || '[]'),
      messages: JSON.parse(localStorage.getItem('ch122_user_messages') || '[]'),
      adminMessages: JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamber122-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Clear All Data (Danger)
  clearAllData() {
    if (!confirm('Are you absolutely sure you want to clear ALL data? This cannot be undone!')) return;
    if (!confirm('This will delete ALL users, businesses, events, and messages. Type "DELETE ALL" to confirm.')) return;
    
    localStorage.removeItem('chamber122_users');
    localStorage.removeItem('chamber122_businesses');
    localStorage.removeItem('chamber122_events');
    localStorage.removeItem('chamber122_bulletins');
    localStorage.removeItem('ch122_user_messages');
    localStorage.removeItem('ch122_inbox_messages');
    
    // Recreate admin account
    ensureAdminAccount();
    
    alert('All data cleared. Admin account recreated.');
    window.location.reload();
  },
  
  // Logout
  logout() {
    if (confirm('Logout from admin dashboard?')) {
      logout();
      window.location.href = '/admin.html';
    }
  }
};

// Make adminDashboard globally available
window.adminDashboard = adminDashboard;

// Debug function to check localStorage
window.debugAdmin = function() {
  console.log('=== ADMIN DASHBOARD DEBUG ===');
  const users = getAllUsers();
  const businesses = getAllBusinesses();
  const documents = JSON.parse(localStorage.getItem('chamber122_documents') || '[]');
  console.log('Users:', users.length, users);
  console.log('Businesses:', businesses.length);
  console.log('Documents:', documents.length);
  console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.includes('chamber122')));
  return { users, businesses, documents };
};

// Create test user function (for debugging)
window.createTestUser = function() {
  const { signup } = require('./auth-localstorage.js');
  const testEmail = `test_${Date.now()}@test.com`;
  const testPassword = 'test123456';
  try {
    const result = signup(testEmail, testPassword, {
      name: 'Test User',
      business_name: 'Test Business',
      phone: '12345678',
      city: 'Kuwait City',
      country: 'Kuwait',
      industry: 'Technology'
    });
    console.log('[admin] Test user created:', result.user);
    alert(`Test user created: ${testEmail}`);
    if (adminDashboard && adminDashboard.currentSection === 'users') {
      adminDashboard.loadUsers();
    }
    return result;
  } catch (error) {
    console.error('[admin] Error creating test user:', error);
    alert('Error creating test user: ' + error.message);
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    adminDashboard.init();
  });
} else {
  adminDashboard.init();
}

// Listen for new user signups
window.addEventListener('userSignup', (event) => {
  console.log('[admin] New user signup detected:', event.detail);
  // Reload users if we're on the users section
  if (adminDashboard.currentSection === 'users') {
    setTimeout(() => {
      adminDashboard.loadUsers();
    }, 500);
  }
});

// Periodically refresh users (every 2 seconds) to catch new signups
setInterval(() => {
  if (adminDashboard && adminDashboard.currentSection === 'users') {
    adminDashboard.loadUsers();
  }
}, 2000);
