import { sb, requireAuth } from "./supabase.js";

let pendingBusinesses = [];
let recentApproved = [];
let isAdmin = false;

// Initialize admin panel
async function initAdmin() {
  try {
    await requireAuth("/auth.html");
    await checkAdminAccess();
    
    if (isAdmin) {
      await loadAdminData();
      renderAdminPanel();
    } else {
      showAccessDenied();
    }
  } catch (error) {
    console.error('Error initializing admin panel:', error);
    showAccessDenied();
  }
}

// Check if user has admin access
async function checkAdminAccess() {
  try {
    const user = await sb().auth.getUser();
    if (!user.data.user) return false;
    
    const { data, error } = await sb().from('admins')
      .select('*')
      .eq('user_id', user.data.user.id)
      .maybeSingle();
    
    if (error) throw error;
    
    isAdmin = !!data;
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

// Load admin data
async function loadAdminData() {
  await Promise.all([
    loadPendingBusinesses(),
    loadRecentApproved(),
    loadAdminStats()
  ]);
}

// Load pending accounts
async function loadPendingBusinesses() {
  try {
    const { data, error } = await sb().from('businesses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    pendingBusinesses = data || [];
  } catch (error) {
    console.error('Error loading pending accounts:', error);
    pendingBusinesses = [];
  }
}

// Load recently approved accounts
async function loadRecentApproved() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await sb().from('businesses')
      .select('*')
      .eq('status', 'approved')
      .gte('updated_at', today.toISOString())
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    recentApproved = data || [];
  } catch (error) {
    console.error('Error loading recent approved:', error);
    recentApproved = [];
  }
}

// Load admin statistics
async function loadAdminStats() {
  try {
    const [pendingResult, totalResult, approvedTodayResult] = await Promise.all([
      sb().from('businesses').select('*', { count: 'exact' }).eq('status', 'pending'),
      sb().from('businesses').select('*', { count: 'exact' }),
      sb().from('businesses').select('*', { count: 'exact' }).eq('status', 'approved').gte('updated_at', new Date().toISOString().split('T')[0])
    ]);
    
    document.getElementById('pending-count').textContent = pendingResult.count || 0;
    document.getElementById('total-count').textContent = totalResult.count || 0;
    document.getElementById('approved-today').textContent = approvedTodayResult.count || 0;
    
  } catch (error) {
    console.error('Error loading admin stats:', error);
  }
}

// Show access denied message
function showAccessDenied() {
  document.getElementById('admin-access').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';
}

// Render admin panel
function renderAdminPanel() {
  document.getElementById('admin-access').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  
  renderPendingList();
  renderRecentApproved();
}

// Render pending accounts list
function renderPendingList() {
  const pendingList = document.getElementById('pending-list');
  if (!pendingList) return;
  
  if (pendingBusinesses.length === 0) {
    pendingList.innerHTML = '<p class="no-data">No pending accounts to review.</p>';
    return;
  }
  
  pendingList.innerHTML = '';
  
  pendingBusinesses.forEach(business => {
    const businessCard = createPendingBusinessCard(business);
    pendingList.appendChild(businessCard);
  });
}

// Render recently approved accounts
function renderRecentApproved() {
  const recentList = document.getElementById('recent-approved');
  if (!recentList) return;
  
  if (recentApproved.length === 0) {
    recentList.innerHTML = '<p class="no-data">No accounts approved today.</p>';
    return;
  }
  
  recentList.innerHTML = '';
  
  recentApproved.forEach(business => {
    const businessCard = createApprovedBusinessCard(business);
    recentList.appendChild(businessCard);
  });
}

// Create pending business card
function createPendingBusinessCard(business) {
  const card = document.createElement('div');
  card.className = 'admin-business-card pending';
  
  card.innerHTML = `
    <div class="business-info">
      <div class="business-header">
        <h4>${business.name}</h4>
        <span class="category">${business.category || 'Uncategorized'}</span>
      </div>
      
      <div class="business-details">
        <p><strong>Owner:</strong> ${business.owner_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${business.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${business.phone || 'N/A'}</p>
        <p><strong>Location:</strong> ${business.city || 'N/A'}</p>
        <p><strong>Submitted:</strong> ${new Date(business.created_at).toLocaleDateString()}</p>
      </div>
      
      <div class="business-description">
        <p><strong>Description:</strong> ${business.description || 'No description provided.'}</p>
        <p><strong>Why Started:</strong> ${business.why_started || 'No story provided.'}</p>
      </div>
      
      ${business.logo_url ? `<div class="business-logo"><img src="${business.logo_url}" alt="${business.name} logo"></div>` : ''}
    </div>
    
    <div class="admin-actions">
      <button class="approve-btn" onclick="approveBusiness(${business.id})">
        <i class="fas fa-check"></i> Approve
      </button>
      <button class="reject-btn" onclick="rejectBusiness(${business.id})">
        <i class="fas fa-times"></i> Reject
      </button>
    </div>
  `;
  
  return card;
}

// Create approved business card
function createApprovedBusinessCard(business) {
  const card = document.createElement('div');
  card.className = 'admin-business-card approved';
  
  card.innerHTML = `
    <div class="business-info">
      <div class="business-header">
        <h4>${business.name}</h4>
        <span class="category">${business.category || 'Uncategorized'}</span>
        <span class="status approved">Approved</span>
      </div>
      
      <div class="business-details">
        <p><strong>Owner:</strong> ${business.owner_name || 'N/A'}</p>
        <p><strong>Approved:</strong> ${new Date(business.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  `;
  
  return card;
}

// Approve business
async function approveBusiness(businessId) {
  if (!confirm('Are you sure you want to approve this business?')) {
    return;
  }
  
  try {
    const { error } = await sb().from('businesses')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);
    
    if (error) throw error;
    
    // Update local data
    const businessIndex = pendingBusinesses.findIndex(b => b.id === businessId);
    if (businessIndex !== -1) {
      const approvedBusiness = { ...pendingBusinesses[businessIndex], status: 'approved' };
      pendingBusinesses.splice(businessIndex, 1);
      recentApproved.unshift(approvedBusiness);
    }
    
    alert('Business approved successfully!');
    
    // Refresh data and UI
    await loadAdminData();
    renderAdminPanel();
    
  } catch (error) {
    console.error('Error approving business:', error);
    alert('Failed to approve business: ' + error.message);
  }
}

// Reject business
async function rejectBusiness(businessId) {
  const reason = prompt('Please provide a reason for rejection:');
  if (!reason) return;
  
  try {
    const { error } = await sb().from('businesses')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);
    
    if (error) throw error;
    
    // Update local data
    const businessIndex = pendingBusinesses.findIndex(b => b.id === businessId);
    if (businessIndex !== -1) {
      pendingBusinesses.splice(businessIndex, 1);
    }
    
    alert('Business rejected successfully!');
    
    // Refresh data and UI
    await loadAdminData();
    renderAdminPanel();
    
  } catch (error) {
    console.error('Error rejecting business:', error);
    alert('Failed to reject business: ' + error.message);
  }
}

// Global functions for onclick handlers
window.approveBusiness = approveBusiness;
window.rejectBusiness = rejectBusiness;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdmin);
