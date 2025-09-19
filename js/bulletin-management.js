import { supabase } from '/js/supabase-client.js';

let currentUser = null;
let bulletins = [];
let editingBulletinId = null;

// DOM elements
const createBulletinBtn = document.getElementById('createBulletinBtn');
const createFirstBulletinBtn = document.getElementById('createFirstBulletinBtn');
const bulletinsList = document.getElementById('bulletinsList');
const emptyState = document.getElementById('emptyState');
const bulletinModal = document.getElementById('bulletinModal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const bulletinForm = document.getElementById('bulletinForm');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const publishBtn = document.getElementById('publishBtn');

// Form elements
const bulletinType = document.getElementById('bulletinType');
const bulletinTitle = document.getElementById('bulletinTitle');
const bulletinDescription = document.getElementById('bulletinDescription');
const bulletinLocation = document.getElementById('bulletinLocation');
const bulletinDeadline = document.getElementById('bulletinDeadline');
const bulletinAttachment = document.getElementById('bulletinAttachment');
const bulletinTags = document.getElementById('bulletinTags');

// Stats elements
const totalBulletinsEl = document.getElementById('totalBulletins');
const publishedBulletinsEl = document.getElementById('publishedBulletins');
const draftBulletinsEl = document.getElementById('draftBulletins');
const expiredBulletinsEl = document.getElementById('expiredBulletins');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializeBulletinManagement();
});

async function initializeBulletinManagement() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth.html#login';
      return;
    }
    currentUser = user;

    // Load bulletins
    await loadBulletins();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing bulletin management:', error);
    showError('Failed to load bulletin management');
  }
}

function setupEventListeners() {
  // Create bulletin buttons
  createBulletinBtn?.addEventListener('click', openCreateModal);
  createFirstBulletinBtn?.addEventListener('click', openCreateModal);
  
  // Modal controls
  closeModal?.addEventListener('click', closeBulletinModal);
  
  // Form submission
  bulletinForm?.addEventListener('submit', handlePublishBulletin);
  saveDraftBtn?.addEventListener('click', handleSaveDraft);
  
  // Close modal on outside click
  bulletinModal?.addEventListener('click', (e) => {
    if (e.target === bulletinModal) {
      closeBulletinModal();
    }
  });
}

async function loadBulletins() {
  try {
    const { data, error } = await supabase
      .from('bulletins')
      .select(`
        *,
        businesses:owner_business_id (
          business_name,
          logo_url
        )
      `)
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    bulletins = data || [];
    renderBulletins();
    updateStats();
    
  } catch (error) {
    console.error('Error loading bulletins:', error);
    showError('Failed to load bulletins');
  }
}

function renderBulletins() {
  if (bulletins.length === 0) {
    emptyState.style.display = 'block';
    bulletinsList.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  bulletinsList.style.display = 'block';
  
  bulletinsList.innerHTML = bulletins.map(bulletin => createBulletinRow(bulletin)).join('');
  
  // Add event listeners to action buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => editBulletin(e.target.dataset.id));
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteBulletin(e.target.dataset.id));
  });
  
  document.querySelectorAll('.btn-publish').forEach(btn => {
    btn.addEventListener('click', (e) => publishBulletin(e.target.dataset.id));
  });
}

function createBulletinRow(bulletin) {
  const createdDate = new Date(bulletin.created_at).toLocaleDateString();
  const deadline = bulletin.deadline_date ? new Date(bulletin.deadline_date).toLocaleDateString() : '-';
  
  const typeLabels = {
    announcement: 'Announcement',
    job_posting: 'Job Posting',
    training: 'Training',
    funding: 'Funding'
  };
  
  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    expired: 'Expired'
  };
  
  const actions = [];
  
  if (bulletin.status === 'draft') {
    actions.push(`<button class="btn-sm btn-publish" data-id="${bulletin.id}">
      <i class="fas fa-paper-plane"></i> Publish
    </button>`);
  }
  
  actions.push(`<button class="btn-sm btn-edit" data-id="${bulletin.id}">
    <i class="fas fa-edit"></i> Edit
  </button>`);
  
  actions.push(`<button class="btn-sm btn-delete" data-id="${bulletin.id}">
    <i class="fas fa-trash"></i> Delete
  </button>`);
  
  return `
    <div class="table-row">
      <div>
        <div class="bulletin-title">${escapeHtml(bulletin.title)}</div>
        <div class="bulletin-meta">Created: ${createdDate}</div>
        ${bulletin.deadline_date ? `<div class="bulletin-meta">Deadline: ${deadline}</div>` : ''}
      </div>
      <div>
        <span class="type-badge type-${bulletin.type}">${typeLabels[bulletin.type]}</span>
      </div>
      <div>
        <span class="status-badge status-${bulletin.status}">${statusLabels[bulletin.status]}</span>
      </div>
      <div>
        ${bulletin.published_at ? new Date(bulletin.published_at).toLocaleDateString() : '-'}
      </div>
      <div class="action-buttons">
        ${actions.join('')}
      </div>
    </div>
  `;
}

function updateStats() {
  const total = bulletins.length;
  const published = bulletins.filter(b => b.status === 'published').length;
  const draft = bulletins.filter(b => b.status === 'draft').length;
  const expired = bulletins.filter(b => b.status === 'expired').length;
  
  totalBulletinsEl.textContent = total;
  publishedBulletinsEl.textContent = published;
  draftBulletinsEl.textContent = draft;
  expiredBulletinsEl.textContent = expired;
}

function openCreateModal() {
  editingBulletinId = null;
  modalTitle.textContent = 'Post Bulletin';
  bulletinForm.reset();
  bulletinModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function editBulletin(bulletinId) {
  const bulletin = bulletins.find(b => b.id === bulletinId);
  if (!bulletin) return;
  
  editingBulletinId = bulletinId;
  modalTitle.textContent = 'Edit Bulletin';
  
  // Populate form
  bulletinType.value = bulletin.type;
  bulletinTitle.value = bulletin.title;
  bulletinDescription.value = bulletin.description;
  bulletinLocation.value = bulletin.location || '';
  bulletinDeadline.value = bulletin.deadline_date ? 
    new Date(bulletin.deadline_date).toISOString().slice(0, 16) : '';
  bulletinTags.value = bulletin.tags ? bulletin.tags.join(', ') : '';
  
  bulletinModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function deleteBulletin(bulletinId) {
  if (!confirm('Are you sure you want to delete this bulletin? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('bulletins')
      .delete()
      .eq('id', bulletinId)
      .eq('owner_id', currentUser.id);
    
    if (error) throw error;
    
    await loadBulletins();
    showSuccess('Bulletin deleted successfully');
    
  } catch (error) {
    console.error('Error deleting bulletin:', error);
    showError('Failed to delete bulletin');
  }
}

async function publishBulletin(bulletinId) {
  try {
    const { error } = await supabase
      .from('bulletins')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', bulletinId)
      .eq('owner_id', currentUser.id);
    
    if (error) throw error;
    
    await loadBulletins();
    showSuccess('Bulletin published successfully');
    
  } catch (error) {
    console.error('Error publishing bulletin:', error);
    showError('Failed to publish bulletin');
  }
}

async function handleSaveDraft(e) {
  e.preventDefault();
  await saveBulletin('draft');
}

async function handlePublishBulletin(e) {
  e.preventDefault();
  await saveBulletin('published');
}

async function saveBulletin(status) {
  try {
    const formData = new FormData(bulletinForm);
    
    // Get business ID if available
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', currentUser.id)
      .single();
    
    const bulletinData = {
      type: bulletinType.value,
      title: bulletinTitle.value,
      description: bulletinDescription.value,
      location: bulletinLocation.value || null,
      deadline_date: bulletinDeadline.value ? new Date(bulletinDeadline.value).toISOString() : null,
      status: status,
      owner_business_id: business?.id || null,
      tags: bulletinTags.value ? bulletinTags.value.split(',').map(t => t.trim()).filter(t => t) : []
    };
    
    // Handle file upload if present
    if (bulletinAttachment.files.length > 0) {
      const file = bulletinAttachment.files[0];
      const fileName = `${currentUser.id}/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bulletin-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('bulletin-attachments')
        .getPublicUrl(fileName);
      
      bulletinData.attachment_url = publicUrl;
      bulletinData.attachment_name = file.name;
    }
    
    let result;
    if (editingBulletinId) {
      // Update existing bulletin
      result = await supabase
        .from('bulletins')
        .update(bulletinData)
        .eq('id', editingBulletinId)
        .eq('owner_id', currentUser.id)
        .select()
        .single();
    } else {
      // Create new bulletin
      result = await supabase
        .from('bulletins')
        .insert({
          ...bulletinData,
          owner_user_id: currentUser.id
        })
        .select()
        .single();
    }
    
    if (result.error) throw result.error;
    
    closeBulletinModal();
    await loadBulletins();
    
    const action = editingBulletinId ? 'updated' : 'created';
    const statusText = status === 'published' ? 'published' : 'saved as draft';
    showSuccess(`Bulletin ${action} and ${statusText} successfully`);
    
  } catch (error) {
    console.error('Error saving bulletin:', error);
    showError('Failed to save bulletin');
  }
}

function closeBulletinModal() {
  bulletinModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  bulletinForm.reset();
  editingBulletinId = null;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSuccess(message) {
  // Simple success notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-weight: 500;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  // Simple error notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-weight: 500;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}
