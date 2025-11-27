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

// Ensure admin account exists
function ensureAdminAccount() {
  const users = getAllUsers();
  const adminExists = users.some(u => u.role === 'admin');
  
  if (!adminExists) {
    const adminUser = {
      id: generateId(),
      email: 'admin@admin.com',
      password: 'admin123',
      role: 'admin',
      status: 'approved',
      created_at: new Date().toISOString()
    };
    users.push(adminUser);
    saveUsers(users);
    console.log('[admin] Auto-created admin account: admin@admin.com / admin123');
  }
}

// Check admin access and redirect if not admin
function checkAdminAccess() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/auth.html#login';
    return false;
  }
  if (!isAdmin()) {
    alert('Access denied. Admin privileges required.');
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Admin Dashboard Object
const adminDashboard = {
  currentSection: 'users',
  
  init() {
    // Ensure admin account exists
    ensureAdminAccount();
    
    // Check admin access
    if (!checkAdminAccess()) {
      return;
    }
    
    // Setup navigation
    this.setupNavigation();
    
    // Load initial section
    this.loadSection('users');
    
    // Setup search and filters
    this.setupSearchAndFilters();
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
    switch(section) {
      case 'users':
        this.loadUsers();
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
      case 'documents':
        this.loadDocuments();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  },
  
  // Users Management
  loadUsers() {
    const users = getAllUsers();
    const tbody = document.getElementById('users-table-body');
    
    // Update stats
    const total = users.length;
    const pending = users.filter(u => u.status === 'pending').length;
    const approved = users.filter(u => u.status === 'approved').length;
    const suspended = users.filter(u => u.status === 'suspended').length;
    
    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-pending-users').textContent = pending;
    document.getElementById('stat-approved-users').textContent = approved;
    document.getElementById('stat-suspended-users').textContent = suspended;
    
    // Render users
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">No users found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = users.map(user => {
      const statusClass = user.status === 'approved' ? 'status-approved' : 
                         user.status === 'suspended' ? 'status-suspended' : 'status-pending';
      const roleBadge = user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '';
      const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
      
      return `
        <tr>
          <td>${user.email} ${roleBadge}</td>
          <td>${user.role || 'msme'}</td>
          <td><span class="status-badge ${statusClass}">${user.status || 'pending'}</span></td>
          <td>${createdDate}</td>
          <td class="actions-cell">
            ${user.status !== 'approved' ? `<button onclick="adminDashboard.approveUser('${user.id}')" class="btn-action btn-approve" title="Approve"><i class="fas fa-check"></i></button>` : ''}
            ${user.status !== 'suspended' ? `<button onclick="adminDashboard.suspendUser('${user.id}')" class="btn-action btn-suspend" title="Suspend"><i class="fas fa-ban"></i></button>` : ''}
            ${user.role !== 'admin' ? `<button onclick="adminDashboard.deleteUser('${user.id}')" class="btn-action btn-delete" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
            <button onclick="adminDashboard.sendMessageToUser('${user.id}', '${user.email}')" class="btn-action btn-message" title="Send Message"><i class="fas fa-envelope"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },
  
  approveUser(userId) {
    if (!confirm('Approve this user?')) return;
    updateUser(userId, { status: 'approved' });
    this.loadUsers();
  },
  
  suspendUser(userId) {
    if (!confirm('Suspend this user?')) return;
    updateUser(userId, { status: 'suspended' });
    this.loadUsers();
  },
  
  deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
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
    
    this.loadUsers();
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
    updateBusiness(businessId, { status: 'approved', is_published: true });
    this.loadMSMEs();
  },
  
  suspendMSME(businessId) {
    if (!confirm('Suspend this MSME?')) return;
    updateBusiness(businessId, { status: 'suspended', is_published: false });
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
    // Documents are stored as part of user signup data
    // For now, show placeholder
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">Document management coming soon.</td></tr>';
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
    
    // Similar for other sections...
  },
  
  filterUsers() {
    // Implementation for filtering users
    this.loadUsers();
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
      window.location.href = '/index.html';
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard.init();
});

// Make adminDashboard globally available
window.adminDashboard = adminDashboard;
