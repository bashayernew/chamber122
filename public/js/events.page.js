// Events page controller - Using localStorage only (no backend, no API)
import { getPublicEvents, createEvent } from '/js/api.js';
import { getCurrentUser } from '/js/auth-localstorage.js';

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

// Load events from localStorage
async function loadEvents() {
  try {
    if (loadingState) loadingState.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (eventsGrid) eventsGrid.classList.add('hidden');
    if (eventsList) eventsList.classList.add('hidden');

    allEvents = await getPublicEvents();
    filteredEvents = [...allEvents];
    
    displayEvents();
  } catch (error) {
    console.error('Error loading events:', error);
    showEmptyState();
  } finally {
    if (loadingState) loadingState.classList.add('hidden');
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
  if (!eventsGrid) return;
  eventsGrid.innerHTML = '';
  eventsGrid.classList.remove('hidden');
  if (eventsList) eventsList.classList.add('hidden');

  filteredEvents.forEach(event => {
    const eventCard = createEventCard(event);
    eventsGrid.appendChild(eventCard);
  });
}

// Display events in list view
function displayListView() {
  if (!eventsList) return;
  eventsList.innerHTML = '';
  eventsList.classList.remove('hidden');
  if (eventsGrid) eventsGrid.classList.add('hidden');

  filteredEvents.forEach(event => {
    const eventItem = createEventListItem(event);
    eventsList.appendChild(eventItem);
  });
}

// Create event card for grid view
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors';

  const title = (event.title || '').toString();
  const description = (event.description || '').toString();
  const location = (event.location || '').toString();
  // Normalize type field
  const eventType = event.type || event.kind || 'event';
  const coverUrl = event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop';
  
  // Format date range
  const startDate = event.start_at ? new Date(event.start_at) : new Date();
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const dateStr = formatDateRange(startDate, endDate);

  card.innerHTML = `
    <div class="relative">
      <img src="${coverUrl}" alt="${escapeHtml(title)}" class="w-full h-48 object-cover">
      <div class="absolute top-3 left-3">
        <span class="bg-primary text-white px-2 py-1 rounded text-xs font-medium">
          ${escapeHtml(eventType.charAt(0).toUpperCase() + eventType.slice(1))}
        </span>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-semibold text-white mb-2 line-clamp-2">${escapeHtml(title || 'Untitled Event')}</h3>
      <div class="space-y-2 mb-3">
        <div class="flex items-center text-sm text-zinc-400">
          <i class="fas fa-calendar w-4 mr-2"></i>
          <span>${escapeHtml(dateStr)}</span>
        </div>
        ${location ? `
          <div class="flex items-center text-sm text-zinc-400">
            <i class="fas fa-map-marker-alt w-4 mr-2"></i>
            <span>${escapeHtml(location)}</span>
          </div>
        ` : ''}
      </div>
      <p class="text-zinc-300 text-sm line-clamp-3 mb-4">${escapeHtml(description || 'No description available.')}</p>
      <div class="flex justify-between items-center">
        <button onclick="showEventDetails('${event.id}')" class="text-primary hover:text-primary/80 text-sm font-medium">
          View Details
        </button>
        ${event.link ? `
          <a href="${escapeHtml(event.link)}" target="_blank" class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
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

  const title = (event.title || '').toString();
  const description = (event.description || '').toString();
  const location = (event.location || '').toString();
  // Normalize type field
  const eventType = event.type || event.kind || 'event';
  const coverUrl = event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=120&fit=crop';
  
  const startDate = event.start_at ? new Date(event.start_at) : new Date();
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const dateStr = formatDateRange(startDate, endDate);

  item.innerHTML = `
    <div class="flex gap-4">
      <img src="${coverUrl}" alt="${escapeHtml(title)}" class="w-32 h-20 object-cover rounded">
      <div class="flex-1">
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-lg font-semibold text-white">${escapeHtml(title || 'Untitled Event')}</h3>
          <span class="bg-primary text-white px-2 py-1 rounded text-xs font-medium">
            ${escapeHtml(eventType.charAt(0).toUpperCase() + eventType.slice(1))}
          </span>
        </div>
        <div class="flex items-center text-sm text-zinc-400 mb-2">
          <i class="fas fa-calendar w-4 mr-2"></i>
          <span>${escapeHtml(dateStr)}</span>
          ${location ? `
            <span class="mx-2">•</span>
            <i class="fas fa-map-marker-alt w-4 mr-1"></i>
            <span>${escapeHtml(location)}</span>
          ` : ''}
        </div>
        <p class="text-zinc-300 text-sm line-clamp-2 mb-3">${escapeHtml(description || 'No description available.')}</p>
        <div class="flex justify-between items-center">
          <button onclick="showEventDetails('${event.id}')" class="text-primary hover:text-primary/80 text-sm font-medium">
            View Details
          </button>
          ${event.link ? `
            <a href="${escapeHtml(event.link)}" target="_blank" class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">
              Register
          </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  return item;
}

// Escape HTML helper
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  if (emptyState) emptyState.classList.remove('hidden');
  if (eventsGrid) eventsGrid.classList.add('hidden');
  if (eventsList) eventsList.classList.add('hidden');
}

// Filter events based on search and type
function filterEvents() {
  const searchTerm = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';
  const typeFilterValue = (typeFilter && typeFilter.value) ? typeFilter.value : '';

  filteredEvents = allEvents.filter(event => {
    const title = (event.title || '').toString().toLowerCase();
    const description = (event.description || '').toString().toLowerCase();
    const location = (event.location || '').toString().toLowerCase();
    
    const matchesSearch = !searchTerm || 
      title.includes(searchTerm) || 
      description.includes(searchTerm) || 
      location.includes(searchTerm);
    
    const matchesType = !typeFilterValue || (event.type || event.kind) === typeFilterValue;
    
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

  // Create Event button
  const createBtn = document.getElementById('create-event-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) {
        alert('Please log in to create events');
        window.location.href = '/auth.html#login';
        return;
      }
      openEventForm();
    });
    }

  // Modal close handlers
  const closeBtn = document.getElementById('close-event-form');
  const cancelBtn = document.getElementById('cancel-event-form');
  const modal = document.getElementById('event-form-modal');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
  });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
  });
  }
  
  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  }

  // Event form submission
  const eventForm = document.getElementById('event-form');
  if (eventForm) {
    eventForm.addEventListener('submit', handleEventFormSubmit);
  }
}

// Load businesses for the dropdown
async function loadBusinessesForForm() {
  try {
    const user = getCurrentUser();
    if (!user || !user.id) return;

    // Get user's business from localStorage
    const { getBusinessByOwner } = await import('/js/auth-localstorage.js');
    const business = getBusinessByOwner(user.id);

    const select = document.getElementById('event-business-select');
    if (select) {
      // Clear existing options except the first one
      select.innerHTML = '<option value="">Select your business...</option>';
      
      if (business) {
        const option = document.createElement('option');
        option.value = business.id;
        option.textContent = business.name || business.business_name || 'My Business';
        select.appendChild(option);
      }
      
      console.log('[events] loaded business for form');
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
  
  try {
    // Get business ID from form selection
    const businessSelect = document.getElementById('event-business-select');
    const businessId = businessSelect && businessSelect.value ? businessSelect.value : null;
    
    if (!businessId) {
      alert('Please select a business first');
      return;
    }

    // Get form data
    const titleEl = document.getElementById('event-title');
    const descriptionEl = document.getElementById('event-description');
    const typeEl = document.getElementById('event-type');
    const startEl = document.getElementById('event-start');
    const endEl = document.getElementById('event-end');
    const locationEl = document.getElementById('event-location');
    const linkEl = document.getElementById('event-link');

    const title = titleEl && titleEl.value ? titleEl.value.trim() : '';
    const description = descriptionEl && descriptionEl.value ? descriptionEl.value.trim() : '';
    const type = typeEl && typeEl.value ? typeEl.value : 'event';
    const startAt = startEl && startEl.value ? startEl.value : '';
    const endAt = endEl && endEl.value ? endEl.value : '';
    const location = locationEl && locationEl.value ? locationEl.value.trim() : '';
    const link = linkEl && linkEl.value ? linkEl.value.trim() : '';

    // Validate required fields
    if (!title) {
      alert('Title is required');
      return;
    }
    if (!startAt) {
      alert('Start date and time is required');
      return;
    }

    // Convert dates to ISO
    const start_at = new Date(startAt).toISOString();
    const end_at = endAt ? new Date(endAt).toISOString() : null;

    // Handle cover image upload if provided
    const coverFileInput = document.getElementById('event-cover');
    let cover_image_url = null;
    
    if (coverFileInput && coverFileInput.files && coverFileInput.files.length > 0) {
      const file = coverFileInput.files[0];
      // Convert to base64
      const reader = new FileReader();
      cover_image_url = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
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
    await createEvent(eventData);
    console.log('[events] Event created successfully');
    
    alert('Event created successfully!');
    
    // Close modal and refresh events
    const modal = document.getElementById('event-form-modal');
    if (modal) modal.style.display = 'none';
    const eventForm = document.getElementById('event-form');
    if (eventForm) eventForm.reset();
    await loadEvents();
    
  } catch (error) {
    console.error('Error creating event:', error);
    alert('Failed to create event: ' + (error.message || 'Please try again'));
  }
}

// Show event details (placeholder)
function showEventDetails(eventId) {
  alert('Event details: ' + eventId);
}

// Make functions globally available
window.showEventDetails = showEventDetails;
