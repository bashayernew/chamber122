// Event Management - Classic Script
(function() {
  'use strict';
  
  // Run once guard
  if (window.__event_loaded__) return;
  window.__event_loaded__ = true;
  
  // Wait for Supabase to be ready
  function waitForSupabase(callback) {
    if (window.sb) {
      callback();
    } else {
      window.addEventListener('supabaseReady', callback);
    }
  }
  
  // Get Supabase client
  function getSupabase() {
    if (!window.sb) {
      throw new Error('Supabase client not available. Make sure supabase-client.global.js is loaded.');
    }
    return window.sb;
  }
  
  // Safe DOM helpers
  function el(id) { 
    return document.getElementById(id); 
  }
  
  function val(id) { 
    return (el(id)?.value || '').trim(); 
  }
  
  // Convert date and time strings to ISO datetime
  function toIso(dateStr, timeStr) {
    const dt = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return dt.toISOString();
  }
  
  // Load events from database
  async function loadEvents() {
    console.log('[events] ✅ FIXED VERSION - using kind filter + start_at order');
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('activities')               // VIEW (RLS-friendly)
        .select('*')
        .eq('type', 'event')              // Use 'type' from VIEW
        .eq('status', 'published')
        .eq('is_published', true)
        .order('created_at', { ascending: false }); // Most recent first

      if (error) {
        console.error('Error loading events:', error);
        displayEvents([]);
        return;
      }

      console.log('[events] ✅ Loaded', data?.length || 0, 'events');
      displayEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      displayEvents([]);
    }
  }

  // Display events in grid
  function displayEvents(events) {
    const grid = document.getElementById('events-grid');
    
    if (!grid) {
      console.warn('Events grid element not found');
      return;
    }
    
    grid.innerHTML = '';
    
    if (events.length === 0) {
      grid.innerHTML = '<p class="no-results">No events found matching your criteria.</p>';
      return;
    }
    
    events.forEach(event => {
      const card = createEventCard(event);
      grid.appendChild(card);
    });
    
    // Wire event delegation for buttons
    wireEventClicks();
  }

  // Create event card
  function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const eventDate = event.start_at ? new Date(event.start_at) : new Date();
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const typeColors = {
      networking: 'var(--gold)',
      training: 'var(--success)',
      promotion: 'var(--warning)',
      market: 'var(--bronze)',
      workshop: 'var(--gold)',
      sale: 'var(--warning)',
      conference: 'var(--gold)',
      exhibition: 'var(--bronze)',
      other: 'var(--gold)'
    };
    
    const imageUrl = event.cover_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop';
    const contact = event.contact_email || event.contact_phone || 'Contact organizer';
    const time = event.start_at ? new Date(event.start_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : 'TBA';
    const location = event.location || 'Location TBA';
    
    card.innerHTML = `
      <div class="event-image">
        <img src="${imageUrl}" alt="${event.title || 'Event'}">
        <div class="event-type-badge" style="background: ${typeColors[event.kind] || 'var(--gold)'}">
          ${event.kind ? event.kind.charAt(0).toUpperCase() + event.kind.slice(1) : 'Event'}
        </div>
      </div>
      <div class="event-details">
        <h3>${event.title || 'Untitled Event'}</h3>
        <div class="event-meta">
          <span class="event-date">
            <i class="fas fa-calendar"></i> ${formattedDate}
          </span>
          <span class="event-time">
            <i class="fas fa-clock"></i> ${time}
          </span>
          <span class="event-location">
            <i class="fas fa-map-marker-alt"></i> ${location}
          </span>
        </div>
        <p class="event-description">${event.description || 'No description available.'}</p>
        <div class="event-actions">
          <button class="event-btn primary learn-more" data-id="${event.id}" data-link="${event.link || ''}">
            Learn More
          </button>
          <button class="event-btn secondary contact" data-email="${event.contact_email || ''}" data-phone="${event.contact_phone || ''}">
            Contact
          </button>
        </div>
      </div>
    `;
    
    return card;
  }

  // Wire event clicks (delegated event handling)
  function wireEventClicks() {
    const grid = document.getElementById('events-grid');
    if (!grid || grid._wired) return;

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('button');

      // Learn More button
      if (btn?.classList.contains('learn-more')) {
        const link = (btn.dataset.link || '').trim();
        const id = (btn.dataset.id || '').trim();
        if (link) {
          window.open(link, '_blank', 'noopener');
        } else if (id) {
          window.location.href = `/event.html?id=${encodeURIComponent(id)}`;
        } else {
          alert('No details available.');
        }
        return;
      }

      // Contact button
      if (btn?.classList.contains('contact')) {
        const email = (btn.dataset.email || '').trim();
        const phone = (btn.dataset.phone || '').trim();
        if (email) {
          window.location.href = `mailto:${email}`;
        } else if (phone) {
          window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
        } else {
          alert('No contact info available.');
        }
        return;
      }
    });

    grid._wired = true;
  }

  // Open event form modal
  function openEventForm() {
    console.log('openEventForm called');
    const modal = el('event-form-modal');
    console.log('Modal element:', modal);
    
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      loadUserBusinesses();
      console.log('Event form modal opened');
    } else {
      console.error('Event form modal not found!');
    }
  }

  // Close event form modal
  function closeEventForm() {
    const modal = el('event-form-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
      resetEventForm();
    }
  }

  // Load user's businesses for the dropdown
  async function loadUserBusinesses() {
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        hideBusinessSelection();
        return;
      }

      const { data: businesses, error } = await sb
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const businessSelect = el('event-business');
      if (businessSelect) {
        businessSelect.innerHTML = '<option value="">Select a business...</option>';
        
        if (businesses && businesses.length > 0) {
          businesses.forEach(business => {
            const option = document.createElement('option');
            option.value = business.id;
            option.textContent = business.name;
            businessSelect.appendChild(option);
          });
        } else {
          businessSelect.innerHTML = '<option value="">No businesses found. Please create a business first.</option>';
          businessSelect.disabled = true;
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      hideBusinessSelection();
    }
  }

  // Hide business selection for guests
  function hideBusinessSelection() {
    const businessSelection = el('business-selection');
    if (businessSelection) {
      businessSelection.style.display = 'none';
    }
  }

  // Reset event form
  function resetEventForm() {
    const form = el('event-creation-form');
    if (form) {
      form.reset();
    }
    
    const statusMessage = el('event-status-message');
    if (statusMessage) {
      statusMessage.style.display = 'none';
      statusMessage.textContent = '';
    }
  }

  // Show status message
  function showStatusMessage(message, type = 'info') {
    const statusMessage = el('event-status-message');
    if (statusMessage) {
      statusMessage.style.display = 'block';
      statusMessage.textContent = message;
      statusMessage.style.backgroundColor = type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff';
      statusMessage.style.color = '#fff';
    }
  }

  // Handle event form submission
  async function handleEventSubmission() {
    const form = el('event-creation-form');
    if (!form) {
      console.error('Event form not found');
      return;
    }

    const submitBtn = el('submit-event');
    if (!submitBtn) {
      console.error('Submit button not found');
      return;
    }
    
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Check if account is suspended
      const { isAccountSuspended } = await import('./api.js');
      if (await isAccountSuspended()) {
        alert('Your account has been suspended. You cannot post events. Please contact support if you have any questions or would like to appeal this decision.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      // Get user's business_id
      const { data: business, error: bizError } = await sb
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (bizError || !business) {
        throw new Error('No business found. Please create a business first.');
      }

      // Validate required fields using safe DOM helpers
      const title = val('event-title');
      const startAt = val('event-start');
      const type = val('event-type');

      if (!title) throw new Error('Event title is required');
      if (!startAt) {
        alert('Start date is required');
        return;
      }
      if (!type) throw new Error('Event type is required');

      // Get other fields safely
      const description = val('event-description');
      const location = val('event-location');
      const contactName = val('contact-name');
      const contactEmail = val('contact-email');
      const contactPhone = val('contact-phone');
      const eventLink = val('event-link');
      const endAt = val('event-end');
      const isPublished = el('event-published')?.checked || false;

      // Convert datetime-local values to ISO format
      const start_at = startAt ? new Date(startAt).toISOString() : null;
      const end_at = endAt ? new Date(endAt).toISOString() : null;

      // Basic validation
      if (end_at && end_at <= start_at) {
        throw new Error('End date must be after start date');
      }

      // Prepare event data for activities_base table
      const eventData = {
        type: 'event',
        business_id: business.id,
        title: title,
        description: description || null,
        location: location || null,
        start_at: start_at,
        end_at: end_at,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        link: eventLink || null,
        status: isPublished ? 'published' : 'draft',
        is_published: isPublished,
        cover_image_url: null // Will be set after upload
      };

      // Handle image upload if provided
      const imageFile = el('event-cover-input')?.files?.[0];
      if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${business.id}/events/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await sb.storage
          .from('business-assets')
          .upload(fileName, imageFile, { upsert: false });
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = sb.storage
          .from('business-assets')
          .getPublicUrl(fileName);
        
        eventData.cover_image_url = publicUrl.publicUrl;
      }

      // Insert event into activities_base table
      const { data, error } = await sb
        .from('activities_base')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Success
      showStatusMessage('Event created successfully! Redirecting...', 'success');
      
      // Close modal
      closeEventForm();
      
      // Refresh activities if functions are available
      if (window.reloadActivities) {
        window.reloadActivities();
      }
      if (window.refreshActivitiesList) {
        window.refreshActivitiesList();
      }
      if (window.refreshOwnerProfileCards) {
        window.refreshOwnerProfileCards();
      }
      if (window.refreshDashboardWidgets) {
        window.refreshDashboardWidgets();
      }
      
      // Redirect to events page after a short delay
      setTimeout(() => {
        window.location.href = '/events.html';
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      showStatusMessage('Failed to create event: ' + error.message, 'error');
    } finally {
      // Restore button state
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Event form modal listeners
    const eventModal = el('event-form-modal');
    const closeBtn = el('close-event-modal');
    const cancelBtn = el('cancel-event');
    const submitBtn = el('submit-event');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeEventForm);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeEventForm);
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleEventSubmission);
    }

    // Close modal when clicking outside
    if (eventModal) {
      eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) {
          closeEventForm();
        }
      });
    }

    // Add event button listener
    const addEventBtn = el('add-event-btn');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', openEventForm);
    }
  }

  // Initialize events page
  function initEventsPage() {
    console.log('Initializing events page...');
    // Remove Supabase dependency - initialize directly
    loadEvents();
    setupEventListeners();
  }

  // Make functions available globally
  window.openEventForm = openEventForm;
  window.closeEventForm = closeEventForm;
  window.loadEvents = loadEvents;
  window.initEventsPage = initEventsPage;
  
  // Auto-initialize if on events page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventsPage);
  } else {
    initEventsPage();
  }
})();
