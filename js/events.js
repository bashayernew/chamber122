// Events page functionality - Fixed Implementation

console.log('[events] Initializing events page...');

// Safe helpers to avoid null.trim crashes
const qs = (sel) => document.querySelector(sel);
const val = (sel) => (qs(sel)?.value ?? '').trim();

// Convert datetime-local string to ISO
const iso = (s) => s ? new Date(s).toISOString() : null;

// Get Supabase client - wait for it to be available
let supabase;

// Function to wait for Supabase client to be ready
async function waitForSupabase() {
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    if (window.__supabaseClient) {
      supabase = window.__supabaseClient;
      console.log('[events] Using global Supabase client');
      return supabase;
    } else if (window.supabase) {
      supabase = window.supabase;
      console.log('[events] Using window.supabase');
      return supabase;
    }
    
    console.log('[events] Waiting for Supabase client... attempt', attempts + 1);
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  console.error('[events] Supabase client not found after', maxAttempts, 'attempts');
  console.error('[events] Available objects:', Object.keys(window).filter(k => k.includes('supabase')));
  return null;
}

// Initialize Supabase client and setup event listeners
waitForSupabase().then(client => {
  if (client) {
    supabase = client;
    console.log('[events] Supabase client ready');
    
    // Setup event listeners after Supabase is ready
    setupEventListeners();
    
    // Load events after setup
    loadEvents();
  } else {
    console.error('[events] Failed to initialize Supabase client');
  }
});

let currentView = 'grid';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Load user's businesses for dropdown
async function loadBusinesses(userId) {
  try {
    console.log('[events] Fetching businesses for user:', userId);
    
    if (!supabase) {
      console.error('[events] Supabase client not available');
      return [];
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', userId);

    if (error) {
      console.error('[events] businesses error:', error);
      return [];
    }

    console.log('[events] Found businesses:', data);
    
    // Since we removed the business dropdown, just return the data
    // The business ID will be retrieved directly in handleEventSubmission
    return data || [];
  } catch (error) {
    console.error('[events] Error loading businesses:', error);
    return [];
  }
}

// Get owner's business ID
async function getOwnerBusinessId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/auth.html';
    throw new Error('Redirecting to login');
  }
  
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, owner_id')
    .eq('owner_id', user.id);

  if (error) throw error;
  if (!businesses || businesses.length === 0) {
    throw new Error('No business profile found for this user');
  }
  
  // If user has multiple businesses, use the selected one
  const selectedBusinessId = val('#event-business');
  if (selectedBusinessId) {
    return selectedBusinessId;
  }
  
  // Otherwise use the first business
  return businesses[0].id;
}

// Load events from database
async function loadEvents() {
  if (!supabase || typeof supabase.from !== 'function') {
    console.error('[events] Supabase client missing');
    return;
  }
  
  try {
    // Load published events only for public display
    const { data: events, error } = await supabase
      .from('activities_base')
      .select('id,business_id,title,description,location,start_at,end_at,cover_image_url,status,is_published,deleted_at,created_at')
      .eq('kind', 'event')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (error) {
      console.error('Error loading events:', error);
      displayEvents([]);
      return;
    }

    console.log('[events] loaded', events?.length ?? 0, 'items');
    displayEvents(events || []);
  } catch (error) {
    console.error('Error loading events:', error);
    displayEvents([]);
  }
}

// Display events in the grid
function displayEvents(events) {
  const grid = qs('#events-grid');
  if (!grid) {
    console.warn('Events grid element not found');
    return;
  }
  
  if (!events || events.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding:40px; color:#aaa;">
        <i class="fas fa-calendar-alt" style="font-size:48px; margin-bottom:16px; display:block;"></i>
        <h3>No published events found</h3>
        <p>Check back later for upcoming events and promotions.</p>
        <p style="margin-top: 16px; font-size: 14px; color: #666;">
          <i class="fas fa-info-circle"></i> 
          If you just created an event, make sure to check "Publish immediately" when creating it.
        </p>
      </div>
    `;
    return;
  }

  grid.innerHTML = events.map(event => `
    <article class="event-card" style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:12px; overflow:hidden; transition:transform 0.2s;">
      <div style="height:200px; background:linear-gradient(135deg, #ffd166, #ff6b6b); position:relative;">
        ${event.cover_image_url ? 
          `<img src="${event.cover_image_url}" alt="${event.title}" style="width:100%; height:100%; object-fit:cover;">` :
          `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#111; font-size:48px;"><i class="fas fa-calendar-alt"></i></div>`
        }
        <div style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.7); color:#fff; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600;">
          ${event.type || 'Event'}
        </div>
      </div>
      <div style="padding:20px;">
        <h3 style="margin:0 0 8px; font-size:18px; font-weight:600; color:#fff;">${event.title || 'Untitled Event'}</h3>
        <time style="color:#ffd166; font-size:14px; font-weight:500; display:block; margin-bottom:8px;">
          <i class="fas fa-clock" style="margin-right:4px;"></i>
          ${event.start_at ? new Date(event.start_at).toLocaleString() : 'TBD'}
        </time>
        ${event.location ? `
          <div style="color:#aaa; font-size:14px; margin-bottom:8px;">
            <i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>
            ${event.location}
          </div>
        ` : ''}
        <p style="color:#ccc; font-size:14px; line-height:1.4; margin:0 0 16px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
          ${event.description || 'No description provided.'}
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="/event.html?id=${event.id}" style="background:#ffd166; color:#111; padding:8px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
            <i class="fas fa-info-circle"></i>
            Learn More
          </a>
          ${event.link ? `
            <a href="${event.link}" target="_blank" rel="noopener" style="background:#2a2a2a; color:#fff; padding:8px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:500; display:inline-flex; align-items:center; gap:4px;">
              <i class="fas fa-external-link-alt"></i>
              Register
            </a>
          ` : ''}
          ${event.contact_email ? `
            <a href="mailto:${event.contact_email}" style="background:#2a2a2a; color:#fff; padding:8px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:500; display:inline-flex; align-items:center; gap:4px;">
              <i class="fas fa-envelope"></i>
              Contact
            </a>
          ` : ''}
        </div>
      </div>
    </article>
  `).join('');
}

// Handle event form submission
async function handleEventSubmission(formEl) {
  try {
    // Wait for Supabase client to be ready
    if (!supabase) {
      console.log('[events] Waiting for Supabase client...');
      await waitForSupabase();
    }
    
    if (!supabase) {
      alert('Error: Unable to connect to server. Please refresh the page.');
      return;
    }

    const fd = new FormData(formEl);

    // Handle image upload if provided
    let coverImageUrl = null;
    const imageFile = fd.get('cover_image');
    if (imageFile && imageFile.size > 0) {
      console.log('[events] Processing image:', imageFile.name, 'Size:', imageFile.size);
      try {
        // Check if storage is available
        console.log('[events] Checking storage availability...');
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          console.error('[events] Storage bucket error:', bucketError);
          throw new Error('Storage not available: ' + bucketError.message);
        }
        
        console.log('[events] Available buckets:', buckets);
        
        // Try to upload to business-media bucket first
        // Get business ID automatically for the logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          console.error('[events] No authenticated user for upload');
          throw new Error('Please sign in to upload images');
        }
        
        const { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();
          
        if (bizError || !business?.id) {
          console.error('[events] No business found for user:', bizError);
          if (bizError?.code === 'PGRST116') {
            throw new Error('No business profile found. Please create a business profile first.');
          }
          throw new Error('No business found for your account');
        }
        
        const businessId = business.id;
        console.log('[events] Upload businessId:', businessId);
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${businessId}/events/event-${Date.now()}.${fileExt}`;
        
        console.log('[events] businessId:', businessId);
        console.log('[events] key:', fileName, 'type:', imageFile.type, 'size:', imageFile.size);
        console.log('[events] Attempting upload to business-media bucket...');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-media')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type || `image/${fileExt}`
          });
        
        if (uploadError) {
          console.error('[events] Image upload error:', uploadError);
          
          // Fallback: Convert image to data URL for temporary storage
          console.log('[events] Storage failed, converting image to data URL...');
          coverImageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          
          console.log('[events] Image converted to data URL (length:', coverImageUrl.length, ')');
          alert('Image will be stored temporarily. For production, configure Supabase storage.');
        } else {
          // Get public URL
          const { data: publicData } = supabase.storage
            .from('business-media')
            .getPublicUrl(`events/${fileName}`);
          
          coverImageUrl = publicData.publicUrl;
          console.log('[events] Image uploaded successfully:', coverImageUrl);
        }
      } catch (uploadErr) {
        console.error('[events] Image upload failed:', uploadErr);
        
        // Final fallback: convert to data URL
        try {
          console.log('[events] Final fallback: converting to data URL...');
          coverImageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          console.log('[events] Image converted to data URL successfully');
        } catch (dataUrlError) {
          console.error('[events] Data URL conversion failed:', dataUrlError);
          alert('Warning: Image processing failed. Event will be created without image.');
          coverImageUrl = null;
        }
      }
    } else {
      console.log('[events] No image file provided or file is empty');
    }

    // Get business ID automatically for the logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('Please sign in to create events');
    }
    
    console.log('[events] Getting business for user:', user.id);
    console.log('[events] User object:', user);
    
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
      
    console.log('[events] Business query result:', { business, bizError });
    console.log('[events] Business ID from query:', business?.id);
    console.log('[events] Business ID type:', typeof business?.id);
    console.log('[events] Full business object:', JSON.stringify(business, null, 2));
    
    if (bizError || !business?.id) {
      console.error('[events] Business not found:', bizError);
      if (bizError?.code === 'PGRST116') {
        const createProfile = confirm('No business profile found. Would you like to create one now?');
        if (createProfile) {
          window.location.href = '/create-business-profile.html';
          return;
        } else {
          throw new Error('Please create a business profile first to create events.');
        }
      }
      throw new Error('No business found for your account');
    }
    
    console.log('[events] Using business ID:', business.id);

    // Build structured location from form fields
    const governorate = (fd.get('governorate') || '').trim();
    const area = (fd.get('area') || '').trim();
    const street = (fd.get('street') || '').trim();
    const office = (fd.get('office') || '').trim();
    const floor = (fd.get('floor') || '').trim();
    
    // Combine location fields into a structured format
    const locationParts = [];
    if (governorate) locationParts.push(governorate);
    if (area) locationParts.push(area);
    if (street) locationParts.push(street);
    if (office) locationParts.push(`Office ${office}`);
    if (floor) locationParts.push(`Floor ${floor}`);
    
    const location = locationParts.length > 0 ? locationParts.join(', ') : null;

    const payload = {
      business_id: business.id,
      title: (fd.get('title') || '').trim(),
      description: (fd.get('description') || '').trim() || null,
      location: location,
      start_at: fd.get('start_at') || null,
      end_at: fd.get('end_at') || null,
      contact_name: (fd.get('contact_name') || '').trim() || null,
      contact_email: (fd.get('contact_email') || '').trim() || null,
      contact_phone: (fd.get('contact_phone') || '').trim() || null,
      link: (fd.get('link') || '').trim() || null,
      cover_image_url: coverImageUrl,
      // New flags (only include if columns exist; we just added them)
      type: new URLSearchParams(window.location.search).get('type') || 'event',
      status: fd.get('publish_now') ? 'published' : 'draft',
      is_published: !!fd.get('publish_now'),
      deleted_at: null
    };

    console.log('[events] create payload:', payload);
    console.log('[events] publish_now value:', fd.get('publish_now'));
    console.log('[events] status will be:', fd.get('publish_now') ? 'published' : 'draft');
    console.log('[events] is_published will be:', !!fd.get('publish_now'));
    
    // Debug: Check if business_id is valid
    if (!payload.business_id) {
      console.error('[events] CRITICAL: business_id is null!');
      throw new Error('Business ID is required but not found. Please create a business profile first.');
    }

    // Minimal required fields
    if (!payload.title || !payload.start_at) {
      throw new Error('Title and start date are required.');
    }

    const insertColumns = [
      'business_id','title','description','location',
      'start_at','end_at','contact_name','contact_email','contact_phone',
      'link','cover_image_url','type','status','is_published','deleted_at'
    ];

    // Insert into events table (for owner dashboard)
    const { data, error, status } = await supabase
      .from('events')
      .insert(payload)
      .select(insertColumns.join(','))  // select back the same fields
      .single();

    if (error) {
      console.error('[events] create error:', { status, error });
      throw new Error(error.message || 'Failed to create event');
    }

    // Also insert into activities_base table (for public pages)
    const activitiesPayload = {
      ...payload,
      type: payload.type || 'event',  // Ensure type is set
      kind: payload.type || 'event'   // Some views might use 'kind' instead of 'type'
    };

    console.log('[events] activities_base payload:', activitiesPayload);

    const { error: activitiesError } = await supabase
      .from('activities_base')
      .insert(activitiesPayload);

    if (activitiesError) {
      console.error('[events] Failed to sync to activities_base:', activitiesError);
      // Don't throw error here, as the main event was created successfully
    } else {
      console.log('[events] Successfully synced to activities_base');
    }

    console.log('[events] create success:', data);

    // Reset form and reload list
    const form = qs('#event-creation-form');
    if (form) form.reset();
    
    closeEventForm();
    await loadEvents();
    console.info('[events] created', data.id);
    
    // Notify owner page to refresh events
    try {
      localStorage.setItem('owner-events-refresh', String(Date.now()));
    } catch (e) {
      console.warn('[events] Could not set refresh notification:', e);
    }
    
    // Show success message
    const errorDiv = qs('#event-error');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.style.background = '#4CAF50';
      errorDiv.textContent = payload.is_published ? 'Event published successfully!' : 'Event saved as draft!';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 3000);
    }
    
    // Also show alert for better visibility
    if (payload.is_published) {
      alert('Event published successfully! It should now appear in the events list.');
    } else {
      alert('Event saved as draft. Check "Publish immediately" to make it visible to everyone.');
    }
    
  } catch (err) {
    console.error('Error creating event:', err);
    const msg = err?.message || 'Failed to create event';
    const errorDiv = qs('#event-error');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.style.background = '#ff4444';
      errorDiv.textContent = msg;
    }
  }
}

// Open event form modal
async function openEventForm() {
  const modal = qs('#event-form-modal');
  console.log('[events] Modal element found:', !!modal);
  if (modal) {
    modal.style.display = 'flex';
    console.log('[events] Event form modal opened');
    
    // Check if submit button is visible
    const submitBtn = qs('#event-submit');
    const cancelBtn = qs('#cancel-event');
    const footer = qs('.event-modal-footer');
    console.log('[events] Submit button visible:', submitBtn ? submitBtn.offsetParent !== null : false);
    console.log('[events] Cancel button visible:', cancelBtn ? cancelBtn.offsetParent !== null : false);
    console.log('[events] Footer element found:', !!footer);
    
    // Refresh Supabase client reference
    if (window.__supabaseClient) {
      supabase = window.__supabaseClient;
      console.log('[events] Refreshed Supabase client reference');
    }
    
    // Load businesses when modal opens
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await loadBusinesses(user.id);
    }
  }
}

// Close event form modal
function closeEventForm() {
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.style.display = 'none';
    // Reset form
    const form = qs('#event-creation-form');
    if (form) form.reset();
    // Hide error message
    const errorDiv = qs('#event-error');
    if (errorDiv) errorDiv.style.display = 'none';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Add event button with auth check
  const addEventBtn = qs('#add-event-btn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Wait for Supabase client to be ready
      if (!supabase) {
        console.log('[events] Waiting for Supabase client...');
        await waitForSupabase();
      }
      
      if (!supabase) {
        alert('Error: Unable to connect to server. Please refresh the page.');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[events] Add button session check:', session);
      if (!session?.user) {
        alert('You must be logged in to post an event.');
        window.location.href = '/auth.html';
        return;
      }
      openEventForm();
    });
  }

  // Event form submission
  const submitBtn = qs('#event-submit');
  const form = qs('#event-creation-form');
  console.log('[events] Submit button found:', !!submitBtn);
  console.log('[events] Form found:', !!form);
  if (submitBtn && form) {
    console.log('[events] Setting up submit button event listener');
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[events] Submit button clicked!');
      handleEventSubmission(form);
    });
  } else {
    console.error('[events] Submit button or form not found!');
  }

  // Close modal buttons
  const closeBtn = qs('#close-event-modal');
  const cancelBtn = qs('#cancel-event');
  if (closeBtn) closeBtn.addEventListener('click', closeEventForm);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEventForm);

  // Close modal on outside click
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEventForm();
      }
    });
  }
}

// Initialize events page
async function initEventsPage() {
  console.log('Initializing events page...');
  
  // Wait for Supabase to be ready with retry logic
  let attempts = 0;
  const maxAttempts = 10;
  
  const waitForSupabase = async () => {
    while (attempts < maxAttempts) {
      if (window.__supabaseClient && typeof window.__supabaseClient.from === 'function') {
        console.log('[events] Supabase client ready after', attempts, 'attempts');
        supabase = window.__supabaseClient;
        await loadBusinesses();
        await loadEvents();
        setupEventListeners();
        return;
      }
      attempts++;
      console.log('[events] Waiting for Supabase client... attempt', attempts);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('[events] Supabase client not ready after', maxAttempts, 'attempts');
  };
  
  await waitForSupabase();
}

// Make functions available globally
window.openEventForm = openEventForm;
window.closeEventForm = closeEventForm;
window.loadEvents = loadEvents;
window.initEventsPage = initEventsPage;
window.handleEventSubmission = handleEventSubmission;

// Function to update form for bulletin creation
function updateFormForBulletin() {
  console.log('[events] Updating form for bulletin creation');
  
  // Update page title
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    pageTitle.textContent = 'Create New Bulletin';
  }
  
  // Update modal title
  const modalTitle = document.querySelector('.event-modal-header h3');
  if (modalTitle) {
    modalTitle.textContent = 'Create New Bulletin';
  }
  
  // Update form labels
  const titleLabel = document.querySelector('label[for="event-title"]');
  if (titleLabel) {
    titleLabel.textContent = 'Bulletin Title *';
  }
  
  const descriptionLabel = document.querySelector('label[for="event-description"]');
  if (descriptionLabel) {
    descriptionLabel.textContent = 'Bulletin Content *';
  }
  
  // Hide event-specific fields (but keep date fields)
  const locationField = document.getElementById('event-location');
  
  if (locationField) {
    locationField.closest('.form-group').style.display = 'none';
  }
  
  // Update submit button text
  const submitBtn = document.getElementById('event-submit');
  if (submitBtn) {
    submitBtn.textContent = 'Create Bulletin';
  }
  
  // Check the publish immediately checkbox for bulletins
  const publishCheckbox = document.getElementById('publish-now');
  if (publishCheckbox) {
    publishCheckbox.checked = true;
    console.log('[events] Auto-checked publish immediately for bulletin');
  }
  
  // Auto-open the form modal for bulletin creation
  console.log('[events] Auto-opening bulletin form...');
  setTimeout(() => {
    console.log('[events] Attempting to open form...');
    console.log('[events] openEventForm available:', typeof window.openEventForm);
    if (window.openEventForm) {
      console.log('[events] Calling openEventForm...');
      window.openEventForm();
    } else {
      console.warn('[events] openEventForm function not available');
    }
  }, 1000); // Increased delay to ensure everything is loaded
}

// Check if this is bulletin creation mode and update form
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('type') === 'bulletin') {
  console.log('[events] Bulletin creation mode detected');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFormForBulletin);
  } else {
    updateFormForBulletin();
  }
}

// Check if we should auto-open the form
if (urlParams.get('autoopen') === 'true') {
  console.log('[events] Auto-open parameter detected');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (window.openEventForm) {
          console.log('[events] Auto-opening form...');
          window.openEventForm();
        }
      }, 1500);
    });
  } else {
    setTimeout(() => {
      if (window.openEventForm) {
        console.log('[events] Auto-opening form...');
        window.openEventForm();
      }
    }, 1500);
  }
}

// Auto-initialize when DOM is ready (but wait for Supabase first)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[events] DOM ready, waiting for Supabase...');
  });
} else {
  console.log('[events] DOM already ready, waiting for Supabase...');
}