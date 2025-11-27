// /js/events.js - Events page using backend API
import { fetchEventsWithBusiness } from './lib/events.fetch.js';
import { createEvent, getCurrentUser, getEventById, registerForEvent } from './api.js';
import { renderEventsGrid } from './lib/events.render.js';

// Safe helpers to avoid null.trim crashes
const qs = (sel) => document.querySelector(sel);
const val = (sel) => {
  const el = qs(sel);
  return el && el.value ? el.value.trim() : '';
};

// Convert datetime-local string to ISO
const iso = (s) => s ? new Date(s).toISOString() : null;

if (window.DEBUG) console.log('[events] Initializing events page...');

// Make openEventForm globally accessible
window.openEventForm = function() {
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Don't reset if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('edit')) {
      const form = qs('#event-creation-form');
      if (form) form.reset();
    }
    const titleInput = qs('#event-title');
    if (titleInput) titleInput.focus();
  } else {
    console.error('[events] Event form modal not found');
  }
};

// Setup event listeners and load events
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupModalHandlers();
  await checkEditMode(); // Check for edit mode first
  loadEvents();
  setupEventDetails();
  setupRegistration();
});

// Load events from API
async function loadEvents() {
  try {
    const { data, error } = await fetchEventsWithBusiness({ 
      scope: 'public', 
      kind: 'all', 
      upcomingOnly: false 
    });

    if (error) {
      console.error('[events] Error loading events:', error);
      showNetworkError('Failed to load events. Please try refreshing the page.');
      displayEvents([]);
      return;
    }

    console.log('[events] loaded', (data && data.length) ? data.length : 0, 'items');
    if (data && data.length > 0) {
      console.log('[events] First event:', data[0]);
    }
    displayEvents(data || []);
  } catch (err) {
    console.error('[events] Error loading events:', err);
    const errorMsg = err.message || String(err);
    if (errorMsg.includes('ERR_NAME_NOT_RESOLVED') || 
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('network')) {
      showNetworkError('Unable to connect to the server. Please check your internet connection and try again.');
    } else {
      showNetworkError('An error occurred while loading events. Please try refreshing the page.');
    }
    displayEvents([]);
  }
}

// Display events using render function
function displayEvents(events) {
  renderEventsGrid(events, {
    mount: qs('#events-grid'),
    emptyMessage: 'No events found.'
  });
}

// Show network error message
function showNetworkError(message) {
  const grid = qs('#events-grid');
  if (grid) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #e11d48; background: #1a1a1a; border-radius: 12px; border: 1px solid #333;">
        <i class="fas fa-wifi" style="font-size: 48px; margin-bottom: 16px; color: #e11d48;"></i>
        <h3 style="color: #e11d48; margin: 0 0 8px 0;">Connection Error</h3>
        <p style="margin: 0; font-size: 14px; color: #aaa;">${message}</p>
      </div>
    `;
  }
}

// Setup modal handlers
function setupModalHandlers() {
  const closeBtn = qs('#close-event-modal');
  const cancelBtn = qs('#cancel-event');
  const modal = qs('#event-form-modal');
  
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
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
}

// Check for edit parameter and load event for editing
async function checkEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  
  if (editId) {
    console.log('[events] Edit mode detected for event:', editId);
    try {
      const event = await getEventById(editId);
      if (!event) {
        alert('Event not found');
        window.location.href = '/events.html';
        return;
      }
      
      // Check if user owns this event
      const user = await getCurrentUser();
      if (!user || event.owner_id !== user.id) {
        alert('You can only edit your own events');
        window.location.href = '/events.html';
        return;
      }
      
      // Open the form modal and populate it
      openEventForm();
      populateEditForm(event);
    } catch (error) {
      console.error('[events] Error loading event for edit:', error);
      alert('Failed to load event for editing');
      window.location.href = '/events.html';
    }
  }
}

// Populate form with event data for editing
function populateEditForm(event) {
  console.log('[events] Populating form with event data:', event);
  
  // Get form elements (using correct IDs from events.html)
  const typeInput = qs('#event-type');
  const titleInput = qs('#event-title');
  const descInput = qs('#event-description');
  const startInput = qs('#event-start');
  const endInput = qs('#event-end');
  const governorateInput = qs('#event-governorate');
  const areaInput = qs('#event-area');
  const streetInput = qs('#event-street');
  const officeInput = qs('#event-office');
  const floorInput = qs('#event-floor');
  const contactNameInput = qs('#event-contact-name');
  const contactEmailInput = qs('#event-contact-email');
  const contactPhoneInput = qs('#event-contact-phone');
  const linkInput = qs('#event-link');
  const imagePreview = qs('#event-image-preview');
  const imagePreviewImg = qs('#event-image-preview-img');
  
  // Populate fields
  if (typeInput) typeInput.value = event.type || event.category || '';
  if (titleInput) titleInput.value = event.title || '';
  if (descInput) descInput.value = event.description || '';
  if (governorateInput) governorateInput.value = event.governorate || '';
  if (areaInput) areaInput.value = event.area || '';
  if (streetInput) streetInput.value = event.street || '';
  if (officeInput) officeInput.value = event.office || event.office_no || '';
  if (floorInput) floorInput.value = event.floor || '';
  if (contactNameInput) contactNameInput.value = event.contact_name || '';
  if (contactEmailInput) contactEmailInput.value = event.contact_email || '';
  if (contactPhoneInput) contactPhoneInput.value = event.contact_phone || '';
  if (linkInput) linkInput.value = event.link || event.url || '';
  
  // Handle dates - convert ISO to datetime-local format
  if (startInput && event.start_at) {
    const startDate = new Date(event.start_at);
    startInput.value = startDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  }
  if (endInput && event.end_at) {
    const endDate = new Date(event.end_at);
    endInput.value = endDate.toISOString().slice(0, 16);
  }
  
  // Handle image preview
  const imageUrl = event.cover_image_url || event.cover_url || '';
  if (imageUrl && imagePreview && imagePreviewImg) {
    imagePreviewImg.src = imageUrl;
    imagePreview.style.display = 'block';
  }
  
  // Store the event ID for update
  const form = qs('#event-creation-form');
  if (form) {
    form.dataset.editId = event.id;
    // Update form title if there's a title element
    const modalTitle = qs('#event-form-modal h2, #event-form-modal .modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Event';
    }
    // Update button text
    const submitBtn = qs('#event-submit');
    if (submitBtn) {
      submitBtn.textContent = 'UPDATE EVENT';
    }
  }
  
  console.log('[events] Form populated for editing event:', event.id);
}

// Setup event listeners for event creation form
function setupEventListeners() {
  const form = qs('#event-creation-form');
  const submitBtn = qs('#event-submit');
  
  if (!form || !submitBtn) {
    console.log('[events] Event creation form not found on this page');
    return;
  }

  // Setup image preview
  const fileInput = qs('#event-image');
  const previewContainer = qs('#event-image-preview');
  const previewImg = qs('#event-image-preview-img');
  if (fileInput && previewContainer && previewImg) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = 'none';
      }
    });
  }

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const user = await getCurrentUser();
    if (!user) {
      alert('Please log in to create events');
      return;
    }
    
    // Check if account is suspended
    const { isAccountSuspended } = await import('./api.js');
    if (await isAccountSuspended()) {
      alert('Your account has been suspended. You cannot post events. Please contact support if you have any questions or would like to appeal this decision.');
      return;
    }

    // Upload image first if provided (check both event-image and event-cover)
    let imageUrl = null;
    const fileInput = qs('#event-image') || qs('#event-cover');
    const editId = form.dataset.editId || new URLSearchParams(window.location.search).get('edit');
    const isEditMode = !!editId;
    
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      try {
        const { uploadFile } = await import('./api.js');
        const uploadResult = await uploadFile(fileInput.files[0], 'event_image');
        imageUrl = uploadResult.publicUrl || uploadResult.public_url;
        console.log('[events] Image uploaded:', imageUrl);
      } catch (uploadError) {
        console.error('[events] Image upload error:', uploadError);
        alert('Failed to upload image. Continuing without image...');
      }
    } else if (isEditMode) {
      // In edit mode, keep existing image if no new one is uploaded
      const imagePreviewImg = qs('#event-image-preview-img');
      if (imagePreviewImg && imagePreviewImg.src && !imagePreviewImg.src.startsWith('data:') && !imagePreviewImg.src.startsWith('blob:')) {
        imageUrl = imagePreviewImg.src;
        console.log('[events] Using existing image:', imageUrl);
      }
    }

    const eventData = {
      title: val('#event-title'),
      description: val('#event-description'),
      type: val('#event-type'),
      start_at: iso(val('#event-start')),
      end_at: iso(val('#event-end')),
      governorate: val('#event-governorate'),
      area: val('#event-area'),
      street: val('#event-street'),
      office: val('#event-office'),
      office_no: val('#event-office'),
      floor: val('#event-floor'),
      contact_name: val('#event-contact-name'),
      contact_email: val('#event-contact-email'),
      contact_phone: val('#event-contact-phone'),
      link: val('#event-link'),
      url: val('#event-link'),
      location: val('#event-location') || [val('#event-governorate'), val('#event-area'), val('#event-street')].filter(Boolean).join(', '),
      cover_image_url: imageUrl,
      status: 'published',
      is_published: true
    };
    
    // Only include fields that have values (don't send empty strings)
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === '' || eventData[key] === null) {
        delete eventData[key];
      }
    });

    if (!eventData.title) {
      alert('Event title is required');
      return;
    }

    // Check if we're in edit mode (editId already declared above)
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? 'Updating...' : 'Creating...';
    }

    try {
      console.log('[events] Submitting event data:', eventData, 'isEditMode:', isEditMode);
      
      let event;
      if (isEditMode) {
        // Update existing event
        const token = localStorage.getItem('session_token');
        const response = await fetch(`/api/events/${editId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to update event' }));
          throw new Error(error.error || 'Failed to update event');
        }
        
        const result = await response.json();
        event = result.event || result;
        alert('Event updated successfully!');
      } else {
        // Create new event
        event = await createEvent(eventData);
        alert('Event created successfully!');
      }
      
      console.log('[events] Event saved successfully:', event);
      
      // Clear edit parameter from URL
      if (isEditMode) {
        window.history.replaceState({}, '', '/events.html');
        form.removeAttribute('data-edit-id');
      }
      
      form.reset();
      const imagePreview = qs('#event-image-preview');
      if (imagePreview) imagePreview.style.display = 'none';
      const modal = qs('#event-form-modal');
      if (modal) modal.style.display = 'none';
      loadEvents(); // Reload events list
    } catch (error) {
      console.error('[events] Error saving event:', error);
      console.error('[events] Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      const errorMsg = error.message || error.error || 'Unknown error';
      alert('Failed to save event: ' + errorMsg);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        // Use the editId already declared in the function scope
        submitBtn.textContent = editId ? 'UPDATE EVENT' : 'CREATE EVENT';
      }
    }
  });
}

// Setup event details modal
function setupEventDetails() {
  // Event details will be handled by showEventDetails function
}

// Show event details modal
window.showEventDetails = async function(eventId) {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      alert('Event not found');
      return;
    }

    let modal = document.getElementById('event-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'event-details-modal';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
      document.body.appendChild(modal);
    }

    const coverImage = event.cover_image_url || event.cover_url || '';
    
    modal.innerHTML = `
      <div style="background: #1a1a1a; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 24px; flex: 1; overflow-y: auto; min-height: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #fff; padding-right: 40px;">${escapeHtml(event.title || 'Event')}</h2>
            <button onclick="document.getElementById('event-details-modal').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; position: absolute; top: 20px; right: 20px; z-index: 10;">&times;</button>
          </div>
          ${coverImage ? `
            <div style="width:100%;height:200px;overflow:hidden;background:#2a2a2a;border-radius:8px;margin-bottom:20px;">
              <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(event.title || 'Event')}" style="width:100%;height:100%;object-fit:cover;">
            </div>
          ` : ''}
          ${event.description ? `<p style="color: #cbd5e1; margin-bottom: 16px; line-height: 1.6;">${escapeHtml(event.description)}</p>` : ''}
          <div style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
            ${event.start_at ? `<div style="margin-bottom: 8px;"><strong>Start:</strong> ${new Date(event.start_at).toLocaleString()}</div>` : ''}
            ${event.end_at ? `<div style="margin-bottom: 8px;"><strong>End:</strong> ${new Date(event.end_at).toLocaleString()}</div>` : ''}
            ${event.location ? `<div style="margin-bottom: 8px;"><strong>Location:</strong> ${escapeHtml(event.location)}</div>` : ''}
            ${event.business_name ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
                <div onclick="window.location.href='/owner.html?businessId=${event.business_id || ''}'" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                  ${event.business_logo_url ? `<img src="${escapeHtml(event.business_logo_url)}" alt="${escapeHtml(event.business_name)}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">` : ''}
                  <div>
                    <div style="color: #cbd5e1; font-weight: 500;">${escapeHtml(event.business_name)}</div>
                    <div style="color: #94a3b8; font-size: 12px;">View Profile →</div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        <!-- Registration Form - Fixed at bottom -->
        <div style="border-top: 1px solid #333; padding: 24px; flex-shrink: 0; background: #1a1a1a;">
          <form id="registration-form">
            <h3 style="color: #fff; margin-bottom: 12px;">Register for this event</h3>
            <input type="text" id="reg-name" placeholder="Your Name" required style="width: 100%; padding: 12px; margin-bottom: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: #fff;">
            <input type="email" id="reg-email" placeholder="Your Email" required style="width: 100%; padding: 12px; margin-bottom: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: #fff;">
            <input type="tel" id="reg-phone" placeholder="Your Phone (optional)" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: #fff;">
            <button type="button" id="submit-registration" data-event-id="${eventId}" class="btn primary" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ffd166, #ffed4e); color: #111; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Register</button>
          </form>
        </div>
      </div>
    `;
    modal.style.display = 'flex';

    // Close button handler
    const closeBtn = modal.querySelector('button[onclick*="event-details-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    const submitBtn = modal.querySelector('#submit-registration');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const nameEl = modal.querySelector('#reg-name');
        const emailEl = modal.querySelector('#reg-email');
        const phoneEl = modal.querySelector('#reg-phone');
        const name = nameEl && nameEl.value ? nameEl.value.trim() : '';
        const email = emailEl && emailEl.value ? emailEl.value.trim() : '';
        const phone = phoneEl && phoneEl.value ? phoneEl.value.trim() : '';

        if (!name || !email) {
          alert('Name and email are required');
          return;
        }

        try {
          await registerForEvent(eventId, { name, email, phone });
          alert('Registration successful!');
          modal.style.display = 'none';
        } catch (error) {
          console.error('[events] Registration error:', error);
          alert('Failed to register: ' + (error.message || 'Unknown error'));
        }
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
    
    console.log('[events] Modal displayed for event:', eventId);
  } catch (error) {
    console.error('[events] Error loading event details:', error);
    alert('Failed to load event details: ' + (error.message || 'Unknown error'));
  }
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup registration form
function setupRegistration() {
  // Registration is handled by showEventDetails modal
}
