// Owner Activities - Simplified Implementation
// This module handles creating and managing activities for the logged-in user

import { supabase } from './supabase-client.js';
import { checkAccountCompleteness, showCompletenessModal, createDraftBanner } from './account-completeness.js';

let currentUser = null;
let userActivities = [];
let userBusinesses = [];
let userBulletins = [];

// Initialize the activities page
async function initActivities() {
  try {
    // Check if user is logged in
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth.html#login';
      return;
    }
    
    currentUser = user;
    console.log('User authenticated:', user.id);
    
    // Load user's businesses, activities, and bulletins
    await loadBusinesses();
    await loadActivities();
    await loadBulletins();
    setupEventListeners();
    renderActivitiesList();
    renderBulletinsList();
    renderBusinessSelector();
    
  } catch (error) {
    console.error('Error initializing activities:', error);
    alert('Failed to load activities page: ' + error.message);
  }
}

// Load user's businesses
async function loadBusinesses() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', currentUser.id);
    
    if (error) {
      console.error('Error loading businesses:', error);
      throw error;
    }
    
    userBusinesses = data || [];
    console.log('Loaded businesses:', userBusinesses.length);
    
  } catch (error) {
    console.error('Error loading businesses:', error);
    userBusinesses = [];
    
    // If it's an authentication error, redirect to login
    if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
      window.location.href = '/auth.html#login';
      return;
    }
  }
}

// Load user's activities from the database
async function loadActivities() {
  try {
    // First, get user's businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', currentUser.id);
    
    if (businessError) {
      console.error('Error loading businesses:', businessError);
      throw businessError;
    }
    
    if (!businesses || businesses.length === 0) {
      console.log('No businesses found for user');
      userActivities = [];
      return;
    }
    
    // Get activities for user's businesses
    const businessIds = businesses.map(b => b.id);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .in('business_id', businessIds)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    userActivities = data || [];
    console.log('Loaded activities:', userActivities.length);
    
  } catch (error) {
    console.error('Error loading activities:', error);
    userActivities = [];
    
    // If it's an authentication error, redirect to login
    if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
      window.location.href = '/auth.html#login';
      return;
    }
    
    alert('Failed to load activities: ' + error.message);
  }
}

// Render business selector dropdown
function renderBusinessSelector() {
  const businessSelect = document.getElementById('business-select');
  if (!businessSelect) return;
  
  businessSelect.innerHTML = '<option value="">Select a business...</option>';
  
  if (userBusinesses.length === 0) {
    businessSelect.innerHTML = '<option value="">No businesses found. Please create a business first.</option>';
    businessSelect.disabled = true;
    return;
  }
  
  userBusinesses.forEach(business => {
    const option = document.createElement('option');
    option.value = business.id;
    option.textContent = business.name;
    businessSelect.appendChild(option);
  });
}

// Setup event listeners for the form
function setupEventListeners() {
  const activityForm = document.getElementById('activity-form');
  const bulletinForm = document.getElementById('bulletin-form');
  
  if (activityForm) {
    activityForm.addEventListener('submit', handleCreateActivity);
  }
  
  if (bulletinForm) {
    bulletinForm.addEventListener('submit', handleCreateBulletin);
  }
}

// Handle creating a new activity
async function handleCreateActivity(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(e.target);
    
    // Extract form data
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    const startsAt = formData.get('starts_at');
    const endsAt = formData.get('ends_at');
    const businessId = formData.get('business_id');
    
    if (!title) {
      throw new Error('Title is required');
    }
    
    if (!businessId) {
      throw new Error('Please select a business');
    }
    
    // Prepare activity data
    const activityData = {
      created_by: currentUser.id,
      business_id: businessId,
      title: title,
      description: description || null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      status: 'draft'
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('activities')
      .insert([activityData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Add to local array and refresh display
    userActivities.unshift(data);
    renderActivitiesList();
    
    // Reset form
    e.target.reset();
    
    alert('Activity created successfully!');
    
  } catch (error) {
    console.error('Error creating activity:', error);
    alert('Failed to create activity: ' + error.message);
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Render the activities list
function renderActivitiesList() {
  const activitiesList = document.getElementById('activities-list');
  if (!activitiesList) return;
  
  if (userActivities.length === 0) {
    activitiesList.innerHTML = `
      <div class="no-activities">
        <i class="fas fa-calendar-plus"></i>
        <p>You don't have any activities yet.</p>
        <p>Create your first activity using the form above!</p>
      </div>
    `;
    return;
  }
  
  activitiesList.innerHTML = '';
  
  userActivities.forEach(activity => {
    const activityCard = createActivityCard(activity);
    activitiesList.appendChild(activityCard);
  });
}

// Create HTML for an activity card
function createActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'activity-card';
  card.dataset.activityId = activity.id;
  
  // Format dates
  const startsAt = activity.starts_at ? new Date(activity.starts_at).toLocaleString() : 'Not set';
  const endsAt = activity.ends_at ? new Date(activity.ends_at).toLocaleString() : 'Not set';
  const createdAt = new Date(activity.created_at).toLocaleDateString();
  
  // Status badge
  const statusClass = activity.status === 'published' ? 'status-published' : 
                     activity.status === 'archived' ? 'status-archived' : 'status-draft';
  
  card.innerHTML = `
    <div class="activity-header">
      <h4>${escapeHtml(activity.title)}</h4>
      <span class="activity-status ${statusClass}">${activity.status}</span>
    </div>
    
    <div class="activity-content">
      ${activity.description ? `<p class="activity-description">${escapeHtml(activity.description)}</p>` : ''}
      
      <div class="activity-meta">
        <div class="meta-item">
          <i class="fas fa-calendar"></i>
          <strong>Starts:</strong> ${startsAt}
        </div>
        <div class="meta-item">
          <i class="fas fa-calendar-check"></i>
          <strong>Ends:</strong> ${endsAt}
        </div>
        <div class="meta-item">
          <i class="fas fa-clock"></i>
          <strong>Created:</strong> ${createdAt}
        </div>
      </div>
    </div>
    
    <div class="activity-actions">
      <button class="btn-edit" onclick="editActivity('${activity.id}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn-delete" onclick="deleteActivity('${activity.id}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  return card;
}

// Edit activity (placeholder for future implementation)
async function editActivity(activityId) {
  const activity = userActivities.find(a => a.id === activityId);
  if (!activity) return;
  
  alert(`Edit functionality for "${activity.title}" would be implemented here.`);
}

// Delete activity
async function deleteActivity(activityId) {
  const activity = userActivities.find(a => a.id === activityId);
  if (!activity) return;
  
  if (!confirm(`Are you sure you want to delete "${activity.title}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);
    
    if (error) throw error;
    
    // Remove from local array and refresh display
    userActivities = userActivities.filter(a => a.id !== activityId);
    renderActivitiesList();
    
    alert('Activity deleted successfully!');
    
  } catch (error) {
    console.error('Error deleting activity:', error);
    alert('Failed to delete activity: ' + error.message);
  }
}

// Handle creating a new bulletin
async function handleCreateBulletin(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(e.target);
    
    // Extract form data
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    const type = formData.get('type');
    const location = formData.get('location').trim();
    const deadline = formData.get('deadline');
    
    if (!title) {
      throw new Error('Title is required');
    }
    
    if (!description) {
      throw new Error('Description is required');
    }
    
    if (!type) {
      throw new Error('Bulletin type is required');
    }
    
    // Get user's business info
    const business = userBusinesses[0];
    if (!business) {
      throw new Error('No business found. Please create a business profile first.');
    }
    
    // Check account completeness before publishing
    const completeness = await checkAccountCompleteness();
    
    if (!completeness.isComplete) {
      // Auto-save as draft first
      const bulletinData = {
        owner_user_id: currentUser.id,
        business_id: business.id,
        business_name: business.name,
        title: title,
        description: description,
        type: type,
        location: location || null,
        deadline_date: deadline || null,
        status: 'draft',
        created_at: new Date().toISOString()
      };
      
      const { data: draftData, error: draftError } = await supabase
        .from('bulletins')
        .insert([bulletinData])
        .select()
        .single();
      
      if (draftError) throw draftError;
      
      // Add to local array
      userBulletins.unshift(draftData);
      renderBulletinsList();
      
      // Show completeness modal
      showCompletenessModal(
        completeness.missingFields,
        () => {
          // Complete Account clicked
          window.location.href = '/account-business.html';
        },
        () => {
          // Keep Editing clicked
          console.log('User chose to keep editing');
        }
      );
      
      return;
    }
    
    // Account is complete, proceed with publishing
    const bulletinData = {
      owner_user_id: currentUser.id,
      business_id: business.id,
      business_name: business.name,
      title: title,
      description: description,
      type: type,
      location: location || null,
      deadline_date: deadline || null,
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('bulletins')
      .insert([bulletinData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Add to local array and refresh display
    userBulletins.unshift(data);
    renderBulletinsList();
    
    // Reset form
    e.target.reset();
    
    alert('Bulletin published successfully!');
    
  } catch (error) {
    console.error('Error creating bulletin:', error);
    alert('Failed to create bulletin: ' + error.message);
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}





// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load user's bulletins
async function loadBulletins() {
  try {
    const { data, error } = await supabase
      .from('bulletins')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading bulletins:', error);
      throw error;
    }
    
    userBulletins = data || [];
    console.log('Loaded bulletins:', userBulletins.length);
    
  } catch (error) {
    console.error('Error loading bulletins:', error);
    userBulletins = [];
    
    // If it's an authentication error, redirect to login
    if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
      window.location.href = '/auth.html#login';
      return;
    }
  }
}

// Handle creating a new bulletin
async function handleCreateBulletin(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(e.target);
    
    // Extract form data
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    const type = formData.get('type');
    const location = formData.get('location').trim();
    const startDate = formData.get('start_date');
    const deadline = formData.get('deadline');
    const attachments = formData.getAll('attachment');
    
    // Validation
    if (!title) {
      throw new Error('Title is required');
    }
    
    if (!description) {
      throw new Error('Description is required');
    }
    
    if (!type) {
      throw new Error('Bulletin type is required');
    }
    
    // Get user's business info for auto-added fields
    const business = userBusinesses[0]; // Use first business for now
    if (!business) {
      throw new Error('No business found. Please create a business profile first.');
    }
    
    // Prepare bulletin data
    const bulletinData = {
      owner_user_id: currentUser.id,
      business_id: business.id,
      business_name: business.name,
      title: title,
      description: description,
      type: type,
      location: location || null,
      start_date: startDate || null,
      deadline_date: deadline || null,
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    // Create bulletin
    const { data, error } = await supabase
      .from('bulletins')
      .insert([bulletinData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating bulletin:', error);
      throw error;
    }
    
    console.log('Bulletin created:', data);
    
    // Handle file attachments if any
    if (attachments.length > 0 && attachments[0].size > 0) {
      try {
        await handleBulletinAttachments(data.id, attachments);
      } catch (attachmentError) {
        console.warn('Failed to upload attachments:', attachmentError);
        // Don't fail the whole operation for attachment errors
      }
    }
    
    // Add to local list
    userBulletins.unshift(data);
    
    // Re-render bulletins list
    renderBulletinsList();
    
    // Reset form
    e.target.reset();
    
    // Show success message with toast-style notification
    showToast('Bulletin published successfully!', 'success');
    
  } catch (error) {
    console.error('Error creating bulletin:', error);
    showToast('Failed to create bulletin: ' + error.message, 'error');
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Handle bulletin attachments
async function handleBulletinAttachments(bulletinId, files) {
  const uploadPromises = files.map(async (file) => {
    if (file.size === 0) return null;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
    }
    
    // Upload to Supabase storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${bulletinId}_${Date.now()}.${fileExt}`;
    const filePath = `bulletins/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('business-files')
      .upload(filePath, file);
    
    if (error) throw error;
    
    return {
      name: file.name,
      path: data.path,
      size: file.size,
      type: file.type
    };
  });
  
  const uploadedFiles = await Promise.all(uploadPromises);
  const validFiles = uploadedFiles.filter(f => f !== null);
  
  if (validFiles.length > 0) {
    // Update bulletin with attachment info
    await supabase
      .from('bulletins')
      .update({ attachments: validFiles })
      .eq('id', bulletinId);
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Render bulletins list
function renderBulletinsList() {
  const bulletinsList = document.getElementById('bulletins-list');
  if (!bulletinsList) return;
  
  if (userBulletins.length === 0) {
    bulletinsList.innerHTML = `
      <div class="no-bulletins">
        <i class="fas fa-bullhorn"></i>
        <p>You don't have any bulletins yet.</p>
        <p>Create your first bulletin using the form above!</p>
      </div>
    `;
    return;
  }
  
  bulletinsList.innerHTML = '';
  
  userBulletins.forEach(bulletin => {
    const bulletinCard = createBulletinCard(bulletin);
    bulletinsList.appendChild(bulletinCard);
  });
}

// Create HTML for a bulletin card
function createBulletinCard(bulletin) {
  const card = document.createElement('div');
  card.className = 'bulletin-card';
  card.dataset.bulletinId = bulletin.id;
  
  // Format dates
  const deadline = bulletin.deadline_date ? new Date(bulletin.deadline_date).toLocaleDateString() : 'No deadline';
  const createdAt = new Date(bulletin.created_at).toLocaleDateString();
  
  // Status badge
  const statusClass = bulletin.status === 'published' ? 'status-published' : 
                     bulletin.status === 'archived' ? 'status-archived' : 'status-draft';
  
  card.innerHTML = `
    <div class="bulletin-header">
      <h4>${escapeHtml(bulletin.title)}</h4>
      <span class="bulletin-status ${statusClass}">${bulletin.status}</span>
    </div>
    
    <div class="bulletin-content">
      ${bulletin.description ? `<p class="bulletin-description">${escapeHtml(bulletin.description)}</p>` : ''}
      
      <div class="bulletin-meta">
        <div class="meta-item">
          <i class="fas fa-tag"></i>
          <strong>Type:</strong> ${bulletin.type}
        </div>
        ${bulletin.location ? `
        <div class="meta-item">
          <i class="fas fa-map-marker-alt"></i>
          <strong>Location:</strong> ${escapeHtml(bulletin.location)}
        </div>
        ` : ''}
        <div class="meta-item">
          <i class="fas fa-calendar"></i>
          <strong>Deadline:</strong> ${deadline}
        </div>
        <div class="meta-item">
          <i class="fas fa-clock"></i>
          <strong>Created:</strong> ${createdAt}
        </div>
      </div>
    </div>
    
    <div class="bulletin-actions">
      <button class="btn-edit" onclick="editBulletin('${bulletin.id}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn-delete" onclick="deleteBulletin('${bulletin.id}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  // Add draft banner for incomplete accounts
  if (bulletin.status === 'draft') {
    const banner = createDraftBanner(bulletin.id);
    card.insertBefore(banner, card.querySelector('.bulletin-content'));
  }
  
  return card;
}

// Edit bulletin (placeholder for future implementation)
async function editBulletin(bulletinId) {
  const bulletin = userBulletins.find(b => b.id === bulletinId);
  if (!bulletin) return;
  
  alert(`Edit functionality for "${bulletin.title}" would be implemented here.`);
}

// Delete bulletin
async function deleteBulletin(bulletinId) {
  const bulletin = userBulletins.find(b => b.id === bulletinId);
  if (!bulletin) return;
  
  if (!confirm(`Are you sure you want to delete "${bulletin.title}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('bulletins')
      .delete()
      .eq('id', bulletinId);
    
    if (error) throw error;
    
    // Remove from local array and refresh display
    userBulletins = userBulletins.filter(b => b.id !== bulletinId);
    renderBulletinsList();
    
    alert('Bulletin deleted successfully!');
    
  } catch (error) {
    console.error('Error deleting bulletin:', error);
    alert('Failed to delete bulletin: ' + error.message);
  }
}


// Make functions globally available for onclick handlers
window.editActivity = editActivity;
window.deleteActivity = deleteActivity;
window.editBulletin = editBulletin;
window.deleteBulletin = deleteBulletin;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initActivities);
