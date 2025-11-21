// /js/events.js
import { uploadBusinessImage } from './lib/uploads.js';
import { fetchEventsWithBusiness } from './lib/events.fetch.js';

// Safe helpers to avoid null.trim crashes
const qs = (sel) => document.querySelector(sel);
const val = (sel) => (qs(sel)?.value ?? '').trim();

// Convert datetime-local string to ISO
const iso = (s) => s ? new Date(s).toISOString() : null;

if (window.DEBUG) console.log('[events] Initializing events page...');

// Get Supabase client - wait for it to be available
let supabase;

// Function to wait for Supabase client to be ready
async function waitForSupabase() {
  return new Promise((resolve) => {
    const checkSupabase = () => {
      if (window.supabase) {
        if (window.DEBUG) console.log('[events] Using global Supabase client');
        resolve(window.supabase);
      } else {
        setTimeout(checkSupabase, 100);
      }
    };
    checkSupabase();
  });
}

// Initialize Supabase client and setup event listeners
waitForSupabase().then(client => {
  if (client) {
    supabase = client;
    if (window.DEBUG) console.log('[events] Supabase client ready');
    setupEventListeners();
    loadEvents();
  }
});

// Load events from database using unified fetch
async function loadEvents() {
  if (!supabase || typeof supabase.from !== 'function') {
    console.error('[events] Supabase client missing');
    return;
  }

  try {
    const { data, error } = await fetchEventsWithBusiness({ 
      scope: 'public', 
      kind: 'all', 
      upcomingOnly: false 
    });

    if (error) {
      console.error('[events] Error loading events:', error);
      displayEvents([]);
      return;
    }

    console.log('[events] loaded', data?.length || 0, 'items');
    if (data && data.length > 0) {
      console.log('[events] First event:', data[0]);
    }
    displayEvents(data || []);
  } catch (err) {
    console.error('[events] Error loading events:', err);
    displayEvents([]);
  }
}

// Display events in the grid
function displayEvents(events) {
  const grid = qs('#events-grid');
  if (!grid) {
    if (window.DEBUG) console.warn('[events] Events grid not found');
    return;
  }

  if (!events || events.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No events found.</p>';
    return;
  }

  grid.innerHTML = events.map(event => `
    <article class="event-card" style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <div class="event-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        ${event.business_logo_url ? `<img src="${event.business_logo_url}" alt="${event.business_name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` : ''}
        <div>
          <h3 style="margin: 0; color: #fff; font-size: 18px;">${event.title}</h3>
          <p style="margin: 4px 0 0; color: #aaa; font-size: 14px;">${event.business_name}</p>
        </div>
      </div>
      ${event.cover_image_url ? `<img src="${event.cover_image_url}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">` : ''}
      <p style="color: #ccc; margin-bottom: 12px; line-height: 1.5;">${event.description || 'No description provided.'}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
        <span style="background: #333; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
          📅 ${new Date(event.start_at).toLocaleDateString()}
        </span>
        ${event.location ? `<span style="background: #333; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📍 ${event.location}</span>` : ''}
      </div>
      ${event.contact_phone || event.contact_email ? `
        <div style="border-top: 1px solid #333; padding-top: 12px;">
          <p style="margin: 0; color: #aaa; font-size: 14px;">
            ${event.contact_phone ? `📞 ${event.contact_phone}` : ''}
            ${event.contact_phone && event.contact_email ? ' • ' : ''}
            ${event.contact_email ? `✉️ ${event.contact_email}` : ''}
          </p>
        </div>
      ` : ''}
    </article>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Add event button with auth check
  const addEventBtn = qs('#add-event-btn');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please sign in to create events.');
        return;
      }
      
      openEventForm();
    });
  }

  // Event form submission
  const form = qs('#event-creation-form');
  const submitBtn = qs('#event-submit');
  
  console.log('[events] Form found:', !!form);
  console.log('[events] Submit button found:', !!submitBtn);
  
  if (form && submitBtn) {
    // Listen for form submit event
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('[events] Form submit event triggered');
      await handleEventSubmission();
    });
    
    // Also listen for submit button click
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('[events] Submit button click event triggered');
      await handleEventSubmission();
    });
    
    console.log('[events] Event listeners attached successfully');
  } else {
    console.error('[events] Form or submit button not found!');
  }

  // Close modal buttons
  const closeBtn = qs('#close-event-modal');
  const cancelBtn = qs('#cancel-event');
  
  if (closeBtn) closeBtn.addEventListener('click', closeEventForm);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEventForm);

  // Close on backdrop click
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeEventForm();
    });
  }
}

// Handle event form submission
async function handleEventSubmission() {
  try {
    console.log('[events] Submit button clicked!');
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be signed in.');
      return;
    }
    
    console.log('[events] User authenticated:', user.email);

    const title = qs('#event-title')?.value?.trim();
    const description = qs('#event-description')?.value?.trim();
    const governorate = qs('#event-governorate')?.value?.trim();
    const area = qs('#event-area')?.value?.trim();
    const street = qs('#event-street')?.value?.trim();
    const office = qs('#event-office')?.value?.trim();
    const floor = qs('#event-floor')?.value?.trim();
    const contact_name = qs('#event-contact-name')?.value?.trim();
    const contact_phone = qs('#event-contact-phone')?.value?.trim();
    const contact_email = qs('#event-contact-email')?.value?.trim();
    const start_at = qs('#event-start')?.value || null;
    const end_at = qs('#event-end')?.value || null;
    const file = qs('#event-cover')?.files?.[0];

    if (!title || !start_at) {
      alert('Title and start date are required.');
      return;
    }

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!biz) throw new Error('No business found for this user.');
    const businessId = biz.id;

    let cover_image_url = null;
    if (file) {
      const up = await uploadBusinessImage({
        supabase,
        businessId,   // ✅ business id
        file,
        kind: 'event',
      });
      cover_image_url = up.publicUrl;
    }

    const { error } = await supabase.from('events').insert({
      business_id: biz.id,
      title, description,
      governorate, area, street, block: office, floor,
      contact_name, contact_phone, contact_email,
      start_at, end_at,
      cover_image_url,
      status: 'published',
      is_published: true
    });

    if (error) throw error;
    alert('✅ Event created successfully!');
    
    // Reset form and close modal
    const form = qs('#event-creation-form');
    if (form) form.reset();
    closeEventForm();
    
    // Force refresh with delay to ensure view is updated
    setTimeout(async () => {
      await loadEvents();
      
      // Refresh all displays
      if (window.refreshEventsAndBulletins) {
        window.refreshEventsAndBulletins();
      }
    }, 1000);
    
  } catch (err) {
    console.error('[events] create failed:', err);
    alert(`Event creation failed: ${err.message}`);
  }
}

// Open event form modal
function openEventForm() {
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (window.DEBUG) console.log('[events] Event form modal opened');
  }
}

// Close event form modal
function closeEventForm() {
  const modal = qs('#event-form-modal');
  if (modal) {
    modal.style.display = 'none';
    if (window.DEBUG) console.log('[events] Event form modal closed');
  }
}

// Make functions available globally
window.openEventForm = openEventForm;
window.closeEventForm = closeEventForm;
window.loadEvents = loadEvents;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.DEBUG) console.log('[events] DOM ready, waiting for Supabase...');
  });
} else {
  if (window.DEBUG) console.log('[events] DOM already ready, waiting for Supabase...');
}