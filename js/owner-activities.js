import { sb, requireAuth } from "./supabase.js";

let userBusinesses = [];
let userActivities = [];
let userAccount = null;
let isFullyLoggedIn = false;

// Local implementation of getAccountAndCompleteness
async function getAccountAndCompleteness() {
  try {
    const { data: { user }, error } = await sb().auth.getUser();
    if (error) throw error;
    if (!user) return { account: null, isFullyLoggedIn: false };

    // Get business info
    const { data: business } = await sb()
      .from('businesses')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    return {
      account: user,
      isFullyLoggedIn: !!business
    };
  } catch (error) {
    console.error('Error getting current account state:', error);
    return { account: null, isFullyLoggedIn: false };
  }
}

// Initialize activities dashboard
async function initActivities() {
  try {
    await requireAuth("/auth.html");
    
    // Check account status and completeness
    const accountData = await getAccountAndCompleteness();
    userAccount = accountData.account;
    isFullyLoggedIn = accountData.isFullyLoggedIn;
    
    await loadUserBusinesses();
    await loadUserActivities();
    setupEventListeners();
    renderUI();
    updateStatusIndicators();
  } catch (error) {
    console.error('Error initializing activities dashboard:', error);
  }
}

// Load user's accounts
async function loadUserBusinesses() {
  try {
    const user = await sb().auth.getUser();
    if (!user.data.user) {
      console.log('No authenticated user found');
      userBusinesses = [];
      return;
    }
    
    // Check if user is authenticated and has valid session
    const { data: { session }, error: sessionError } = await sb().auth.getSession();
    if (sessionError || !session) {
      console.log('No valid session found:', sessionError);
      userBusinesses = [];
      return;
    }
    
    const { data, error } = await sb().from('businesses')
      .select('*')
      .eq('owner_id', user.data.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      // If it's an auth error, redirect to login
      if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
        window.location.href = '/auth.html';
        return;
      }
      throw error;
    }
    
    userBusinesses = data || [];
  } catch (error) {
    console.error('Error loading user accounts:', error);
    userBusinesses = [];
    
    // If it's an authentication error, redirect to login
    if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
      window.location.href = '/auth.html';
    }
  }
}

// Load user's activities
async function loadUserActivities() {
  try {
    const user = await sb().auth.getUser();
    if (!user.data.user) {
      console.log('No authenticated user found for activities');
      userActivities = [];
      return;
    }
    
    // Check if user is authenticated and has valid session
    const { data: { session }, error: sessionError } = await sb().auth.getSession();
    if (sessionError || !session) {
      console.log('No valid session found for activities:', sessionError);
      userActivities = [];
      return;
    }
    
    const { data, error } = await sb().from('activities')
      .select(`
        *,
        accounts:business_id (
          name,
          logo_url
        )
      `)
      .eq('created_by', user.data.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase activities error:', error);
      // If it's an auth error, redirect to login
      if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
        window.location.href = '/auth.html';
        return;
      }
      throw error;
    }
    
    userActivities = data || [];
  } catch (error) {
    console.error('Error loading user activities:', error);
    userActivities = [];
    
    // If it's an authentication error, redirect to login
    if (error.message.includes('JWT') || error.message.includes('auth') || error.status === 401) {
      window.location.href = '/auth.html';
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  const businessSelect = document.getElementById('business-select');
  const activityForm = document.getElementById('activity-form');
  
  if (businessSelect) {
    businessSelect.addEventListener('change', onBusinessSelect);
  }
  
  if (activityForm) {
    activityForm.addEventListener('submit', handleActivitySubmit);
  }
}

// Render UI based on user's accounts
function renderUI() {
  const businessSelector = document.getElementById('business-selector');
  const activityCreator = document.getElementById('activity-creator');
  const businessSelect = document.getElementById('business-select');
  
  if (userBusinesses.length === 0) {
    businessSelector.style.display = 'block';
    activityCreator.style.display = 'none';
    
    if (businessSelect) {
      businessSelect.innerHTML = '<option value="">No accounts found. Please create a business first.</option>';
    }
  } else {
    businessSelector.style.display = 'block';
    activityCreator.style.display = 'block';
    
    if (businessSelect) {
      businessSelect.innerHTML = '<option value="">Select a business...</option>';
      userBusinesses.forEach(business => {
        const option = document.createElement('option');
        option.value = business.id;
        option.textContent = business.name;
        businessSelect.appendChild(option);
      });
    }
  }
  
  renderActivitiesList();
}

// Update status indicators
function updateStatusIndicators() {
  const statusIndicator = document.getElementById('account-status');
  if (!statusIndicator) return;

  if (isFullyLoggedIn) {
    statusIndicator.innerHTML = `
      <div class="status-badge approved">
        <i class="fas fa-check-circle"></i>
        <span>Fully Verified - Instant Publishing Enabled</span>
      </div>
    `;
  } else if (userAccount) {
    const status = userAccount.status;
    const completeness = userAccount.profile_completeness || 0;
    
    statusIndicator.innerHTML = `
      <div class="status-badge ${status}">
        <i class="fas fa-${status === 'pending' ? 'clock' : status === 'approved' ? 'check-circle' : 'exclamation-triangle'}"></i>
        <span>Account: ${status} | Profile: ${completeness}% Complete</span>
      </div>
      <div class="status-message">
        ${status === 'pending' ? 'Your account is pending approval. Complete your profile to enable instant publishing.' : 
          status === 'approved' && completeness < 80 ? 'Complete your profile to enable instant publishing.' :
          'Complete your profile to enable instant publishing.'}
      </div>
    `;
  } else {
    statusIndicator.innerHTML = `
      <div class="status-badge warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span>No Business Profile Found</span>
      </div>
      <div class="status-message">
        Create your business profile to start publishing content.
      </div>
    `;
  }
}

// Handle business selection
function onBusinessSelect() {
  const businessSelect = document.getElementById('business-select');
  const selectedBusinessId = businessSelect.value;
  
  if (selectedBusinessId) {
    // Enable activity creation for selected business
    document.getElementById('activity-form').style.display = 'block';
  } else {
    document.getElementById('activity-form').style.display = 'none';
  }
}

// Handle activity form submission
async function handleActivitySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  submitBtn.disabled = true;
  
  try {
    const user = await sb().auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');
    
    const businessSelect = document.getElementById('business-select');
    const selectedBusinessId = businessSelect.value;
    
    if (!selectedBusinessId) {
      throw new Error('Please select a business first');
    }
    
    const formData = new FormData(form);
    // Determine status based on account verification
    const status = isFullyLoggedIn ? 'published' : 'pending';
    
    const activityData = {
      created_by: user.data.user.id,
      business_id: selectedBusinessId,
      type: formData.get('type'),
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      date: formData.get('date') || null,
      time: formData.get('time') || null,
      location: formData.get('location')?.trim() || null,
      link: formData.get('link')?.trim() || null,
      status: status
    };
    
    // Handle cover image upload if provided
    const coverFile = formData.get('cover');
    if (coverFile && coverFile.size > 0) {
      const path = `${user.data.user.id}/activities/${Date.now()}_${coverFile.name}`;
      
      const { error: uploadError } = await sb().storage
        .from('business-media')
        .upload(path, coverFile, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: publicUrl } = sb().storage
        .from('business-media')
        .getPublicUrl(path);
      
      activityData.cover_image_url = publicUrl.publicUrl;
    }
    
    // Insert activity into database
    const { data, error } = await sb().from('activities')
      .insert([activityData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Add to local data and re-render
    userActivities.unshift(data);
    
    // Show appropriate success message
    if (isFullyLoggedIn) {
      alert('Activity published successfully! It\'s now live on the site.');
    } else {
      alert('Activity submitted successfully! It will be reviewed before publishing.');
    }
    
    form.reset();
    renderActivitiesList();
    
  } catch (error) {
    console.error('Error creating activity:', error);
    alert('Failed to create activity: ' + error.message);
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Render activities list
function renderActivitiesList() {
  const activitiesList = document.getElementById('activities-list');
  if (!activitiesList) return;
  
  if (userActivities.length === 0) {
    activitiesList.innerHTML = '<p class="no-data">No activities created yet.</p>';
    return;
  }
  
  activitiesList.innerHTML = '';
  
  userActivities.forEach(activity => {
    const activityCard = createActivityCard(activity);
    activitiesList.appendChild(activityCard);
  });
}

// Create activity card
function createActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'activity-card';
  
  const business = userBusinesses.find(b => b.id === activity.business_id);
  const businessName = business ? business.name : 'Unknown Business';
  
  card.innerHTML = `
    <div class="activity-header">
      <h4>${activity.title}</h4>
      <span class="activity-type ${activity.type}">${activity.type}</span>
    </div>
    
    <div class="activity-business">
      <strong>Business:</strong> ${businessName}
    </div>
    
    <div class="activity-description">
      ${activity.description}
    </div>
    
    ${activity.date ? `<div class="activity-date"><strong>Date:</strong> ${new Date(activity.date).toLocaleDateString()}</div>` : ''}
    ${activity.time ? `<div class="activity-time"><strong>Time:</strong> ${activity.time}</div>` : ''}
    ${activity.location ? `<div class="activity-location"><strong>Location:</strong> ${activity.location}</div>` : ''}
    ${activity.link ? `<div class="activity-link"><strong>Link:</strong> <a href="${activity.link}" target="_blank">${activity.link}</a></div>` : ''}
    
    ${activity.cover_image_url ? `<div class="activity-cover"><img src="${activity.cover_image_url}" alt="Activity cover"></div>` : ''}
    
    <div class="activity-actions">
      <button class="edit-btn" onclick="editActivity(${activity.id})">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="delete-btn" onclick="deleteActivity(${activity.id})">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  return card;
}

// Edit activity
async function editActivity(activityId) {
  const activity = userActivities.find(a => a.id === activityId);
  if (!activity) return;
  
  // For now, just show an alert. In a full implementation, you'd show an edit form
  alert(`Edit functionality for "${activity.title}" would open here. This is a placeholder for the edit form.`);
}

// Delete activity
async function deleteActivity(activityId) {
  if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await sb().from('activities')
      .delete()
      .eq('id', activityId);
    
    if (error) throw error;
    
    // Remove from local data and re-render
    userActivities = userActivities.filter(a => a.id !== activityId);
    alert('Activity deleted successfully!');
    renderActivitiesList();
    
  } catch (error) {
    console.error('Error deleting activity:', error);
    alert('Failed to delete activity: ' + error.message);
  }
}

// Global functions for onclick handlers
window.editActivity = editActivity;
window.deleteActivity = deleteActivity;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initActivities);
