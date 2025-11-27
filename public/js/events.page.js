// Events page controller
import { listEventsPublic, toast, createEvent, getOwnerBusinessId, uploadEventCover } from './api.js';
import { requireAuthOrPrompt } from './auth-guard.js';
import { supabase } from './supabase-client.global.js';

let allEvents = [];
let filteredEvents = [];
let currentView = 'grid';

// DOM elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const eventsGrid = document.getElementById('eventsGrid');
const eventsList = document.getElementById('eventsList');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const viewToggle = document.getElementById('viewToggle');

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  setupEventListeners();
});

// Load events from API
async function loadEvents() {
  try {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    eventsGrid.classList.add('hidden');
    eventsList.classList.add('hidden');

    allEvents = await listEventsPublic();
    filteredEvents = [...allEvents];
    
    displayEvents();
  } catch (error) {
    console.error('Error loading events:', error);
    toast('Failed to load events. Please try again.', 'error');
    showEmptyState();
  } finally {
    loadingState.classList.add('hidden');
  }
}

// Display events in current view
function displayEvents() {
  if (filteredEvents.length === 0) {
    showEmptyState();
    return;
  }

  if (currentView === 'grid') {
    displayGridView();
  } else {
    displayListView();
  }
}

// Display events in grid view
function displayGridView() {
  eventsGrid.innerHTML = '';
  eventsGrid.classList.remove('hidden');
  eventsList.classList.add('hidden');

  filteredEvents.forEach(event => {
    const eventCard = createEventCard(event);
    eventsGrid.appendChild(eventCard);
  });
}

// Display events in list view
function displayListView() {
  eventsList.innerHTML = '';
  eventsList.classList.remove('hidden');
  eventsGrid.classList.add('hidden');

  filteredEvents.forEach(event => {
    const eventItem = createEventListItem(event);
    eventsList.appendChild(eventItem);
  });
}

// Create event card for grid view
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors';

  const title = (event.title ?? '').toString();
  const description = (event.description ?? '').toString();
  const location = (event.location ?? '').toString();
  // Normalize type field
  const eventType = event.type ?? event.kind ?? 'event';
  const coverUrl = event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop';
  
  // Format date range
  const startDate = event.start_at ? new Date(event.start_at) : new Date();
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const dateStr = formatDateRange(startDate, endDate);

  card.innerHTML = `
    <div class="relative">
      <img src="${coverUrl}" alt="${title}" class="w-full h-48 object-cover">
      <div class="absolute top-3 left-3">
        <span class="bg-primary text-white px-2 py-1 rounded text-xs font-medium">
          ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}
        </span>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-semibold text-white mb-2 line-clamp-2">${title || 'Untitled Event'}</h3>
      <div class="space-y-2 mb-3">
        <div class="flex items-center text-sm text-zinc-400">
          <i class="fas fa-calendar w-4 mr-2"></i>
          <span>${dateStr}</span>
        </div>
        ${location ? `
          <div class="flex items-center text-sm text-zinc-400">
            <i class="fas fa-map-marker-alt w-4 mr-2"></i>
            <span>${location}</span>
          </div>
        ` : ''}
      </div>
      <p class="text-zinc-300 text-sm line-clamp-3 mb-4">${description || 'No description available.'}</p>
      <div class="flex justify-between items-center">
        <button onclick="showEventDetails('${event.id}')" class="text-primary hover:text-primary/80 text-sm font-medium">
          View Details
        </button>
        ${event.link ? `
          <a href="${event.link}" target="_blank" class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
            Register
          </a>
        ` : ''}
      </div>
    </div>
  `;

  return card;
}

// Create event item for list view
function createEventListItem(event) {
  const item = document.createElement('div');
  item.className = 'bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors';

  const title = (event.title ?? '').toString();
  const description = (event.description ?? '').toString();
  const location = (event.location ?? '').toString();
  // Normalize type field
  const eventType = event.type ?? event.kind ?? 'event';
  const coverUrl = event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=120&fit=crop';
  
  const startDate = event.start_at ? new Date(event.start_at) : new Date();
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const dateStr = formatDateRange(startDate, endDate);

  item.innerHTML = `
    <div class="flex gap-4">
      <img src="${coverUrl}" alt="${title}" class="w-32 h-20 object-cover rounded">
      <div class="flex-1">
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-lg font-semibold text-white">${title || 'Untitled Event'}</h3>
          <span class="bg-primary text-white px-2 py-1 rounded text-xs font-medium">
            ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}
          </span>
        </div>
        <div class="flex items-center text-sm text-zinc-400 mb-2">
          <i class="fas fa-calendar w-4 mr-2"></i>
          <span>${dateStr}</span>
          ${location ? `
            <span class="mx-2">•</span>
            <i class="fas fa-map-marker-alt w-4 mr-1"></i>
            <span>${location}</span>
          ` : ''}
        </div>
        <p class="text-zinc-300 text-sm line-clamp-2 mb-3">${description || 'No description available.'}</p>
        <div class="flex justify-between items-center">
          <button onclick="showEventDetails('${event.id}')" class="text-primary hover:text-primary/80 text-sm font-medium">
            View Details
          </button>
          ${event.link ? `
            <a href="${event.link}" target="_blank" class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
              Register
          </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  return item;
}

// Format date range
function formatDateRange(startDate, endDate) {
  const start = startDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
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
}

// Show empty state
function showEmptyState() {
  emptyState.classList.remove('hidden');
  eventsGrid.classList.add('hidden');
  eventsList.classList.add('hidden');
}

// Filter events based on search and type
function filterEvents() {
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const typeFilterValue = typeFilter?.value || '';

  filteredEvents = allEvents.filter(event => {
    const title = (event.title ?? '').toString().toLowerCase();
    const description = (event.description ?? '').toString().toLowerCase();
    const location = (event.location ?? '').toString().toLowerCase();
    
    const matchesSearch = !searchTerm || 
      title.includes(searchTerm) || 
      description.includes(searchTerm) || 
      location.includes(searchTerm);
    
    const matchesType = !typeFilterValue || (event.type ?? event.kind) === typeFilterValue;
    
    return matchesSearch && matchesType;
  });

  displayEvents();
}


// Setup event listeners
function setupEventListeners() {
  if (searchInput) {
    searchInput.addEventListener('input', filterEvents);
  }
  
  if (typeFilter) {
    typeFilter.addEventListener('change', filterEvents);
  }
  
  if (viewToggle) {
    viewToggle.addEventListener('click', () => {
      currentView = currentView === 'grid' ? 'list' : 'grid';
      viewToggle.innerHTML = currentView === 'grid' ? '<i class="fas fa-th-large"></i>' : '<i class="fas fa-list"></i>';
      displayEvents();
    });
  }

  // Create Event button with auth guard
  const createBtn = document.getElementById('create-event-btn');
  createBtn?.addEventListener('click', async () => {
    try {
      await requireAuthOrPrompt();
      // If we get here, user is authenticated
      openEventForm();
    } catch (e) {
      if (e?.message !== 'AUTH_REQUIRED') console.error(e);
    }
  });

  // Modal close handlers
  const closeBtn = document.getElementById('close-event-form');
  const cancelBtn = document.getElementById('cancel-event-form');
  const modal = document.getElementById('event-form-modal');
  
  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  cancelBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Event form submission
  const eventForm = document.getElementById('event-form');
  eventForm?.addEventListener('submit', handleEventFormSubmit);
}

// Load businesses for the dropdown
async function loadBusinessesForForm() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error loading businesses:', error);
      return;
    }

    const select = document.getElementById('event-business-select');
    if (select && businesses) {
      // Clear existing options except the first one
      select.innerHTML = '<option value="">Select your business...</option>';
      
      businesses.forEach(business => {
        const option = document.createElement('option');
        option.value = business.id;
        option.textContent = business.name;
        select.appendChild(option);
      });
      
      console.log('[events] loaded', businesses.length, 'businesses for form');
    }
  } catch (error) {
    console.error('Error loading businesses for form:', error);
  }
}

// Open event form modal
async function openEventForm() {
  const modal = document.getElementById('event-form-modal');
  if (modal) {
    modal.style.display = 'flex';
    console.log('Event form modal opened');
    // Load businesses when form opens
    await loadBusinessesForForm();
  }
}

// Handle event form submission
async function handleEventFormSubmit(e) {
  e.preventDefault();
  
  // Check if account is suspended
  const { isAccountSuspended } = await import('/js/api.js');
  if (await isAccountSuspended()) {
    toast('Your account has been suspended. You cannot post events. Please contact support if you have any questions or would like to appeal this decision.', 'error');
    return;
  }
  
  try {
    // Get business ID from form selection
    const businessId = document.getElementById('event-business-select')?.value;
    if (!businessId) {
      toast('Please select a business first', 'error');
      return;
    }

    // Get form data
    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const type = document.getElementById('event-type').value;
    const startAt = document.getElementById('event-start').value;
    const endAt = document.getElementById('event-end').value;
    const location = document.getElementById('event-location').value.trim();
    const link = document.getElementById('event-link').value.trim();

    // Validate required fields
    if (!title) {
      toast('Title is required', 'error');
      return;
    }
    if (!startAt) {
      toast('Start date and time is required', 'error');
      return;
    }

    // Convert dates to ISO
    const start_at = new Date(startAt).toISOString();
    const end_at = endAt ? new Date(endAt).toISOString() : null;

    // Handle cover image upload if provided
    const coverFileInput = document.getElementById('event-cover');
    let cover_image_url = null;
    
    if (coverFileInput && coverFileInput.files && coverFileInput.files[0]) {
      console.log('[events] starting cover image upload for businessId:', businessId);
      const uploadResult = await uploadEventCover(coverFileInput.files[0], businessId);
      cover_image_url = uploadResult.url;
      
      if (uploadResult.usedFallback) {
        console.warn('[events] used data URL fallback for cover image');
      } else {
        console.log('[events] cover image uploaded successfully:', cover_image_url);
      }
    }

    // Create event data
    const eventData = {
      business_id: businessId,
      type: 'event',
      kind: type,
      title,
      description,
      start_at,
      end_at,
      location: location || null,
      link: link || null,
      cover_image_url,
      status: 'published',
      is_published: true
    };

    // Create event
    const eventId = await createEvent(eventData);
    console.log('[events] create success with row id:', eventId, 'and cover_image_url:', cover_image_url);
    
    toast('Event created successfully!', 'success');
    
    // Close modal and refresh events
    document.getElementById('event-form-modal').style.display = 'none';
    eventForm.reset();
    await loadEvents();
    
  } catch (error) {
    console.error('Error creating event:', error);
    toast(`Failed to create event: ${error.message}`, 'error');
  }
}

// Show event details (placeholder)
function showEventDetails(eventId) {
  toast('Event details modal would open here', 'info');
}

// Make functions globally available
window.showEventDetails = showEventDetails;