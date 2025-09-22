import { supabase } from '/js/supabase-client.js';

let currentUser = null;
let events = [];
let editingEventId = null;

// DOM elements
const createEventBtn = document.getElementById('createEventBtn');
const createFirstEventBtn = document.getElementById('createFirstEventBtn');
const eventsList = document.getElementById('eventsList');
const emptyState = document.getElementById('emptyState');
const eventModal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const eventForm = document.getElementById('eventForm');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const publishBtn = document.getElementById('publishBtn');

// Form elements
const eventTitle = document.getElementById('eventTitle');
const eventDescription = document.getElementById('eventDescription');
const eventLocation = document.getElementById('eventLocation');
const eventStartDate = document.getElementById('eventStartDate');
const eventEndDate = document.getElementById('eventEndDate');
const eventImage = document.getElementById('eventImage');

// Stats elements
const totalEventsEl = document.getElementById('totalEvents');
const publishedEventsEl = document.getElementById('publishedEvents');
const draftEventsEl = document.getElementById('draftEvents');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializeEventManagement();
});

async function initializeEventManagement() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth.html#login';
      return;
    }
    currentUser = user;

    // Load events
    await loadEvents();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing event management:', error);
    showError('Failed to load event management');
  }
}

function setupEventListeners() {
  // Create event buttons
  createEventBtn?.addEventListener('click', openCreateModal);
  createFirstEventBtn?.addEventListener('click', openCreateModal);
  
  // Modal controls
  closeModal?.addEventListener('click', closeEventModal);
  
  // Form submission
  eventForm?.addEventListener('submit', handlePublishEvent);
  saveDraftBtn?.addEventListener('click', handleSaveDraft);
  
  // Close modal on outside click
  eventModal?.addEventListener('click', (e) => {
    if (e.target === eventModal) {
      closeEventModal();
    }
  });
}

async function loadEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        businesses:business_id (
          name,
          logo_url
        )
      `)
      .eq('owner_id', currentUser.id)
      .order('start_at', { ascending: true });

    if (error) throw error;
    
    events = data || [];
    renderEvents();
    updateStats();
    
  } catch (error) {
    console.error('Error loading events:', error);
    showError('Failed to load events');
  }
}

function renderEvents() {
  if (events.length === 0) {
    emptyState.style.display = 'block';
    eventsList.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  eventsList.style.display = 'block';
  
  eventsList.innerHTML = events.map(event => createEventRow(event)).join('');
  
  // Add event listeners to action buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => editEvent(e.target.dataset.id));
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteEvent(e.target.dataset.id));
  });
  
  document.querySelectorAll('.btn-publish').forEach(btn => {
    btn.addEventListener('click', (e) => publishEvent(e.target.dataset.id));
  });
}

function createEventRow(event) {
  const startDate = new Date(event.start_at).toLocaleDateString();
  const endDate = event.end_at ? new Date(event.end_at).toLocaleDateString() : '-';
  
  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    pending: 'Pending',
    archived: 'Archived'
  };
  
  const actions = [];
  
  if (event.status === 'draft') {
    actions.push(`<button class="btn-sm btn-publish" data-id="${event.id}">
      <i class="fas fa-paper-plane"></i> Publish
    </button>`);
  }
  
  actions.push(`<button class="btn-sm btn-edit" data-id="${event.id}">
    <i class="fas fa-edit"></i> Edit
  </button>`);
  
  actions.push(`<button class="btn-sm btn-delete" data-id="${event.id}">
    <i class="fas fa-trash"></i> Delete
  </button>`);
  
  return `
    <div class="table-row">
      <div>
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="event-meta">Start: ${startDate}</div>
        ${event.end_at ? `<div class="event-meta">End: ${endDate}</div>` : ''}
      </div>
      <div>
        <span class="location-badge">${event.location || 'TBD'}</span>
      </div>
      <div>
        <span class="status-badge status-${event.status}">${statusLabels[event.status]}</span>
      </div>
      <div>
        ${event.is_published ? 'Published' : 'Draft'}
      </div>
      <div class="action-buttons">
        ${actions.join('')}
      </div>
    </div>
  `;
}

function updateStats() {
  const total = events.length;
  const published = events.filter(e => e.is_published).length;
  const draft = events.filter(e => !e.is_published).length;
  
  totalEventsEl.textContent = total;
  publishedEventsEl.textContent = published;
  draftEventsEl.textContent = draft;
}

function openCreateModal() {
  editingEventId = null;
  modalTitle.textContent = 'Create Event';
  eventForm.reset();
  eventModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function editEvent(eventId) {
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  
  editingEventId = eventId;
  modalTitle.textContent = 'Edit Event';
  
  // Populate form
  eventTitle.value = event.title;
  eventDescription.value = event.description;
  eventLocation.value = event.location || '';
  eventStartDate.value = event.start_at ? 
    new Date(event.start_at).toISOString().slice(0, 16) : '';
  eventEndDate.value = event.end_at ? 
    new Date(event.end_at).toISOString().slice(0, 16) : '';
  
  eventModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('owner_id', currentUser.id);
    
    if (error) throw error;
    
    await loadEvents();
    showSuccess('Event deleted successfully');
    
  } catch (error) {
    console.error('Error deleting event:', error);
    showError('Failed to delete event');
  }
}

async function publishEvent(eventId) {
  try {
    const { error } = await supabase
      .from('events')
      .update({ 
        is_published: true,
        status: 'published'
      })
      .eq('id', eventId)
      .eq('owner_id', currentUser.id);
    
    if (error) throw error;
    
    await loadEvents();
    showSuccess('Event published successfully');
    
  } catch (error) {
    console.error('Error publishing event:', error);
    showError('Failed to publish event');
  }
}

async function handleSaveDraft(e) {
  e.preventDefault();
  await saveEvent(false);
}

async function handlePublishEvent(e) {
  e.preventDefault();
  await saveEvent(true);
}

async function saveEvent(isPublished) {
  try {
    const eventData = {
      title: eventTitle.value,
      description: eventDescription.value,
      location: eventLocation.value || null,
      start_at: eventStartDate.value ? new Date(eventStartDate.value).toISOString() : null,
      end_at: eventEndDate.value ? new Date(eventEndDate.value).toISOString() : null,
      is_published: isPublished,
      status: isPublished ? 'published' : 'draft'
    };
    
    // Handle file upload if present
    if (eventImage.files.length > 0) {
      const file = eventImage.files[0];
      const fileName = `${currentUser.id}/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);
      
      eventData.image_url = publicUrl;
    }
    
    let result;
    if (editingEventId) {
      // Update existing event
      result = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEventId)
        .eq('owner_id', currentUser.id)
        .select()
        .single();
    } else {
      // Create new event - NO business_id needed, trigger will handle it
      result = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();
    }
    
    if (result.error) throw result.error;
    
    closeEventModal();
    await loadEvents();
    
    const action = editingEventId ? 'updated' : 'created';
    const statusText = isPublished ? 'published' : 'saved as draft';
    showSuccess(`Event ${action} and ${statusText} successfully`);
    
  } catch (error) {
    console.error('Error saving event:', error);
    showError('Failed to save event');
  }
}

function closeEventModal() {
  eventModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  eventForm.reset();
  editingEventId = null;
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
