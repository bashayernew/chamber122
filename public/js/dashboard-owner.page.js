// Dashboard owner page controller
import { 
  getOwnerBusinessId, 
  listActivitiesForBusiness, 
  listDraftsForBusiness, 
  createEvent, 
  toast,
  combineToIso
} from './api.js';

let businessId = null;
let currentTab = 'published';
let publishedActivities = [];
let drafts = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
  setupEventListeners();
});

// Load dashboard data
async function loadDashboard() {
  try {
    businessId = await getOwnerBusinessId();
    
    if (!businessId) {
      toast('Please sign in to access the dashboard', 'error');
      return;
    }

    await Promise.all([
      loadPublishedActivities(),
      loadDrafts()
    ]);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    toast('Failed to load dashboard. Please try again.', 'error');
  }
}

// Load published activities
async function loadPublishedActivities() {
  try {
    const publishedLoading = document.getElementById('publishedLoading');
    const publishedEmpty = document.getElementById('publishedEmpty');
    const publishedList = document.getElementById('publishedList');

    publishedLoading.classList.remove('hidden');
    publishedEmpty.classList.add('hidden');
    publishedList.classList.add('hidden');

    publishedActivities = await listActivitiesForBusiness(businessId);
    displayPublishedActivities();
  } catch (error) {
    console.error('Error loading published activities:', error);
    toast('Failed to load published activities', 'error');
  } finally {
    document.getElementById('publishedLoading').classList.add('hidden');
  }
}

// Load drafts
async function loadDrafts() {
  try {
    const draftsLoading = document.getElementById('draftsLoading');
    const draftsEmpty = document.getElementById('draftsEmpty');
    const draftsList = document.getElementById('draftsList');

    draftsLoading.classList.remove('hidden');
    draftsEmpty.classList.add('hidden');
    draftsList.classList.add('hidden');

    drafts = await listDraftsForBusiness(businessId);
    displayDrafts();
  } catch (error) {
    console.error('Error loading drafts:', error);
    toast('Failed to load drafts', 'error');
  } finally {
    document.getElementById('draftsLoading').classList.add('hidden');
  }
}

// Display published activities
function displayPublishedActivities() {
  const publishedEmpty = document.getElementById('publishedEmpty');
  const publishedList = document.getElementById('publishedList');

  if (publishedActivities.length === 0) {
    publishedEmpty.classList.remove('hidden');
    publishedList.classList.add('hidden');
    return;
  }

  publishedEmpty.classList.add('hidden');
  publishedList.classList.remove('hidden');
  publishedList.innerHTML = '';

  publishedActivities.forEach(activity => {
    const activityItem = createActivityItem(activity, true);
    publishedList.appendChild(activityItem);
  });
}

// Display drafts
function displayDrafts() {
  const draftsEmpty = document.getElementById('draftsEmpty');
  const draftsList = document.getElementById('draftsList');

  if (drafts.length === 0) {
    draftsEmpty.classList.remove('hidden');
    draftsList.classList.add('hidden');
    return;
  }

  draftsEmpty.classList.add('hidden');
  draftsList.classList.remove('hidden');
  draftsList.innerHTML = '';

  drafts.forEach(draft => {
    const draftItem = createDraftItem(draft);
    draftsList.appendChild(draftItem);
  });
}

// Create activity item for published feed
function createActivityItem(activity, isPublished = false) {
  const item = document.createElement('div');
  item.className = 'bg-zinc-800 rounded-lg p-6 border border-zinc-700 hover:border-zinc-600 transition-colors';

  const title = (activity.title ?? '').toString();
  const description = (activity.description ?? '').toString();
  const location = (activity.location ?? '').toString();
  const kind = activity.type || 'event';
  const coverUrl = activity.cover_image_url || getDefaultCoverUrl(kind);
  
  const dateInfo = formatActivityDate(activity, kind);
  const statusBadge = createStatusBadge(activity.status, activity.is_published);

  item.innerHTML = `
    <div class="flex gap-4">
      <div class="flex-shrink-0">
        <img src="${coverUrl}" alt="${title}" class="w-24 h-24 object-cover rounded-lg">
      </div>
      <div class="flex-1">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="bg-primary text-white px-2 py-1 rounded text-xs font-medium">
              ${kind.charAt(0).toUpperCase() + kind.slice(1)}
            </span>
            ${statusBadge}
          </div>
          <span class="text-xs text-zinc-500">
            ${formatRelativeTime(activity.created_at)}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">${title || 'Untitled'}</h3>
        <div class="flex items-center text-sm text-zinc-400 mb-2">
          <i class="fas ${kind === 'event' ? 'fa-calendar' : 'fa-bullhorn'} w-4 mr-2"></i>
          <span>${dateInfo}</span>
          ${location ? `
            <span class="mx-2">•</span>
            <i class="fas fa-map-marker-alt w-4 mr-1"></i>
            <span>${location}</span>
          ` : ''}
        </div>
        <p class="text-zinc-300 text-sm line-clamp-2 mb-3">${description || 'No description available.'}</p>
        <div class="flex justify-between items-center">
          <div class="flex space-x-2">
            ${activity.contact_email ? `
              <a href="mailto:${activity.contact_email}" class="text-primary hover:text-primary/80 text-sm">
                <i class="fas fa-envelope mr-1"></i>Contact
              </a>
            ` : ''}
            ${activity.link ? `
              <a href="${activity.link}" target="_blank" class="text-primary hover:text-primary/80 text-sm">
                <i class="fas fa-external-link-alt mr-1"></i>Register
              </a>
            ` : ''}
          </div>
          <div class="flex space-x-2">
            <button onclick="editActivity('${activity.id}', '${kind}')" class="text-zinc-400 hover:text-white text-sm">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteActivity('${activity.id}', '${kind}')" class="text-red-400 hover:text-red-300 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return item;
}

// Create draft item
function createDraftItem(draft) {
  const item = document.createElement('div');
  item.className = 'bg-zinc-800 rounded-lg p-6 border border-zinc-700 hover:border-zinc-600 transition-colors';

  const title = (draft.title ?? '').toString();
  const description = (draft.description ?? '').toString();
  const kind = draft.type || 'event';
  const coverUrl = draft.cover_image_url || getDefaultCoverUrl(kind);
  
  const dateInfo = formatActivityDate(draft, kind);
  const statusBadge = createStatusBadge(draft.status, draft.is_published);

  item.innerHTML = `
    <div class="flex gap-4">
      <div class="flex-shrink-0">
        <img src="${coverUrl}" alt="${title}" class="w-24 h-24 object-cover rounded-lg">
      </div>
      <div class="flex-1">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium">
              ${kind.charAt(0).toUpperCase() + kind.slice(1)} Draft
            </span>
            ${statusBadge}
          </div>
          <span class="text-xs text-zinc-500">
            ${formatRelativeTime(draft.created_at)}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">${title || 'Untitled'}</h3>
        <div class="flex items-center text-sm text-zinc-400 mb-2">
          <i class="fas ${kind === 'event' ? 'fa-calendar' : 'fa-bullhorn'} w-4 mr-2"></i>
          <span>${dateInfo}</span>
        </div>
        <p class="text-zinc-300 text-sm line-clamp-2 mb-3">${description || 'No description available.'}</p>
        <div class="flex justify-between items-center">
          <div class="flex space-x-2">
            <button onclick="editActivity('${draft.id}', '${kind}')" class="text-primary hover:text-primary/80 text-sm">
              <i class="fas fa-edit mr-1"></i>Edit
            </button>
            <button onclick="publishActivity('${draft.id}', '${kind}')" class="text-green-400 hover:text-green-300 text-sm">
              <i class="fas fa-eye mr-1"></i>Publish
            </button>
          </div>
          <button onclick="deleteActivity('${draft.id}', '${kind}')" class="text-red-400 hover:text-red-300 text-sm">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  return item;
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.getElementById('publishedTab').addEventListener('click', () => switchTab('published'));
  document.getElementById('draftsTab').addEventListener('click', () => switchTab('drafts'));

  // Modal controls
  document.getElementById('createEventBtn').addEventListener('click', openEventModal);
  document.getElementById('createBulletinBtn').addEventListener('click', () => toast('Bulletin creation coming soon!', 'info'));
  document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
  document.getElementById('cancelEvent').addEventListener('click', closeEventModal);
  
  // Event form submission
  document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);

  // Close modal on outside click
  document.getElementById('eventModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('eventModal')) {
      closeEventModal();
    }
  });
}

// Switch tabs
function switchTab(tab) {
  currentTab = tab;
  
  const publishedTab = document.getElementById('publishedTab');
  const draftsTab = document.getElementById('draftsTab');
  const publishedContent = document.getElementById('publishedContent');
  const draftsContent = document.getElementById('draftsContent');
  
  // Update tab buttons
  if (tab === 'published') {
    publishedTab.className = 'tab-button border-b-2 border-primary text-primary py-2 px-1 text-sm font-medium';
    draftsTab.className = 'tab-button border-b-2 border-transparent text-zinc-400 hover:text-zinc-300 py-2 px-1 text-sm font-medium';
    publishedContent.classList.remove('hidden');
    draftsContent.classList.add('hidden');
  } else {
    draftsTab.className = 'tab-button border-b-2 border-primary text-primary py-2 px-1 text-sm font-medium';
    publishedTab.className = 'tab-button border-b-2 border-transparent text-zinc-400 hover:text-zinc-300 py-2 px-1 text-sm font-medium';
    draftsContent.classList.remove('hidden');
    publishedContent.classList.add('hidden');
  }
}

// Open event modal
function openEventModal() {
  document.getElementById('eventModal').classList.remove('hidden');
  // Reset form
  document.getElementById('eventForm').reset();
  document.getElementById('eventIsPublished').checked = true;
}

// Close event modal
function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

// Handle event form submission
async function handleEventSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitEvent');
  const submitText = document.getElementById('submitEventText');
  const submitSpinner = document.getElementById('submitEventSpinner');

  try {
    // Disable submit button and show spinner
    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    submitSpinner.classList.remove('hidden');

    // Get form data
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const contact_email = document.getElementById('eventContactEmail').value.trim() || null;
    const contact_phone = document.getElementById('eventContactPhone').value.trim() || null;
    const link = document.getElementById('eventRegistrationUrl').value.trim() || null;
    const status = document.getElementById('eventStatus').value;
    const is_published = document.getElementById('eventIsPublished').checked;
    
    // Handle date/time fields - convert to ISO
    const startAtInput = document.getElementById('eventStartAt').value;
    const endAtInput = document.getElementById('eventEndAt').value;
    
    const start_at = startAtInput ? new Date(startAtInput).toISOString() : null;
    const end_at = endAtInput ? new Date(endAtInput).toISOString() : null;

    const formData = {
      type: 'event',
      title,
      description,
      location,
      start_at,
      end_at,
      contact_name: null, // Not collected in form
      contact_email,
      contact_phone,
      link,
      status,
      is_published,
      cover_image_url: null, // Will be set after image upload if provided
      business_id: businessId
    };

    // Validate required fields
    if (!formData.title) {
      throw new Error('Title is required');
    }
    if (!formData.start_at) {
      throw new Error('Start date and time is required');
    }

    // Handle cover image upload if provided
    const coverUrlInput = document.getElementById('eventCoverUrl');
    if (coverUrlInput && coverUrlInput.value.trim()) {
      formData.cover_image_url = coverUrlInput.value.trim();
    }

    // Create event
    const eventId = await createEvent(formData);
    
    toast('Event created successfully!', 'success');
    closeEventModal();
    
    // Refresh data
    await Promise.all([
      loadPublishedActivities(),
      loadDrafts()
    ]);

    // Switch to appropriate tab
    if (formData.status === 'published' && formData.is_published) {
      switchTab('published');
    } else {
      switchTab('drafts');
    }

  } catch (error) {
    console.error('Error creating event:', error);
    toast(`Failed to create event: ${error.message}`, 'error');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
  }
}

// Helper functions
function formatActivityDate(activity, kind) {
  if (kind === 'event') {
    const startDate = activity.start_at ? new Date(activity.start_at) : new Date();
    const endDate = activity.end_at ? new Date(activity.end_at) : null;
    
    const start = startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    if (!endDate) return start;
    
    const end = endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    return `${start} - ${end}`;
  } else {
    const publishDate = activity.start_at ? new Date(activity.start_at) : new Date();
    return publishDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
}

function createStatusBadge(status, isPublished) {
  const isPublic = status === 'published' && isPublished;
  const badgeClass = isPublic ? 'bg-green-600' : 'bg-yellow-600';
  const badgeText = isPublic ? 'Published' : 'Draft';
  
  return `<span class="${badgeClass} text-white px-2 py-1 rounded text-xs font-medium">${badgeText}</span>`;
}

function getDefaultCoverUrl(kind) {
  if (kind === 'event') {
    return 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop';
  } else {
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop';
  }
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Action handlers (placeholders)
function editActivity(activityId, kind) {
  toast(`Edit ${kind} functionality would open here`, 'info');
}

function deleteActivity(activityId, kind) {
  if (confirm(`Are you sure you want to delete this ${kind}?`)) {
    toast(`Delete ${kind} functionality would be implemented here`, 'info');
  }
}

function publishActivity(activityId, kind) {
  toast(`Publish ${kind} functionality would be implemented here`, 'info');
}

// Make functions globally available
window.editActivity = editActivity;
window.deleteActivity = deleteActivity;
window.publishActivity = publishActivity;
