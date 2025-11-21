// Activities list for public pages (events.html and bulletins.html)
import { supabase } from './supabase-client.js';
import { normalizeActivities } from './common-activities.js';

/**
 * Refresh events page - loads published events from VIEW
 * The VIEW currently exposes 'kind' column, not 'type'
 */
window.refreshEventsPage = async function refreshEventsPage() {
  try {
    const { data, error } = await supabase
      .from('activities_current')
      .select('id,business_id,business_name,business_logo_url,title,description,location,cover_image_url,created_at,start_at,end_at,contact_phone,contact_email')
      .eq('type', 'event')
      .order('created_at', { ascending: false }); // Most recent first
    
    if (error) {
      console.error('[refreshEventsPage] Error:', error);
      renderEvents([]);
      return;
    }
    
    const normalized = normalizeActivities(data);
    renderEvents(normalized);
    console.info('[refreshEventsPage] Loaded', data?.length || 0, 'events');
  } catch (err) {
    console.error('[refreshEventsPage] Exception:', err);
    renderEvents([]);
  }
};

/**
 * Refresh bulletins page - loads published bulletins from VIEW
 * The VIEW currently exposes 'kind' column, not 'type'
 */
window.refreshBulletinsPage = async function refreshBulletinsPage() {
  try {
    const { data, error } = await supabase
      .from('activities_current')
      .select('id,business_id,business_name,business_logo_url,title,description,location,cover_image_url,created_at,contact_phone,contact_email')
      .eq('type', 'bulletin')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[refreshBulletinsPage] Error:', error);
      renderBulletins([]);
      return;
    }
    
    // Filter out fake/test bulletins before normalizing
    const filtered = (data || []).filter(b => {
      // Check for valid title and description
      if (!b.title || !b.description) return false;
      const title = b.title.trim();
      const description = (b.description || '').trim();
      if (!title || !description) return false;
      
      // Filter out test/fake bulletins
      const titleLower = title.toLowerCase();
      if (titleLower.includes('test') || 
          titleLower.includes('fake') || 
          titleLower.includes('dummy') ||
          titleLower.includes('sample')) {
        return false;
      }
      
      // Require minimum length for meaningful content
      if (title.length < 3 || description.length < 10) return false;
      
      // Must have a valid business_id
      if (!b.business_id) return false;
      
      return true;
    });
    
    const normalized = normalizeActivities(filtered);
    renderBulletins(normalized);
  } catch (err) {
    console.error('[refreshBulletinsPage] Exception:', err);
    renderBulletins([]);
  }
};

/**
 * Render events list
 * @param {Array} events - Array of event records
 */
function renderEvents(events) {
  const container = document.getElementById('events-grid') || 
                    document.getElementById('eventsGrid') ||
                    document.querySelector('[data-events-list]');
  
  if (!container) {
    console.warn('[renderEvents] No events container found');
    return;
  }
  
  if (events.length === 0) {
    container.innerHTML = '<div class="no-results"><p>No events found.</p></div>';
    return;
  }
  
  container.innerHTML = events.map(event => createEventCard(event)).join('');
}

/**
 * Render bulletins list
 * @param {Array} bulletins - Array of bulletin records
 */
function renderBulletins(bulletins) {
  const container = document.getElementById('bulletin-grid') ||
                    document.getElementById('bulletinsGrid') ||
                    document.querySelector('[data-bulletins-list]');
  
  if (!container) {
    console.warn('[renderBulletins] No bulletins container found');
    return;
  }
  
  if (bulletins.length === 0) {
    container.innerHTML = '<div class="no-results"><p>No bulletins found.</p></div>';
    return;
  }
  
  container.innerHTML = bulletins.map(bulletin => createBulletinCard(bulletin)).join('');
}

/**
 * Create event card HTML
 * @param {Object} event - Event record
 * @returns {string} HTML string
 */
function createEventCard(event) {
  const title = (event.title || '').toString();
  const description = (event.description || '').toString();
  const location = (event.location || '').toString();
  const coverUrl = event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop';
  
  const startDate = event.start_at ? new Date(event.start_at) : new Date();
  const formattedDate = startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const time = startDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `
    <div class="event-card">
      <div class="event-image">
        <img src="${coverUrl}" alt="${title}">
        <div class="event-type-badge">Event</div>
      </div>
      <div class="event-details">
        <h3>${title || 'Untitled Event'}</h3>
        <div class="event-meta">
          <span class="event-date">
            <i class="fas fa-calendar"></i> ${formattedDate}
          </span>
          <span class="event-time">
            <i class="fas fa-clock"></i> ${time}
          </span>
          ${location ? `
            <span class="event-location">
              <i class="fas fa-map-marker-alt"></i> ${location}
            </span>
          ` : ''}
        </div>
        <p class="event-description">${description || 'No description available.'}</p>
        <div class="event-actions">
          ${event.link ? `
            <a href="${event.link}" target="_blank" class="event-btn primary">
              Learn More
            </a>
          ` : ''}
          ${event.contact_email ? `
            <a href="mailto:${event.contact_email}" class="event-btn secondary">
              Contact
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Create bulletin card HTML
 * @param {Object} bulletin - Bulletin record
 * @returns {string} HTML string
 */
function createBulletinCard(bulletin) {
  const title = (bulletin.title || '').toString();
  const description = (bulletin.description || '').toString();
  const coverUrl = bulletin.cover_image_url;
  
  const date = bulletin.created_at ? new Date(bulletin.created_at) : new Date();
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="bulletin-card">
      ${coverUrl ? `
        <div class="bulletin-image">
          <img src="${coverUrl}" alt="${title}">
        </div>
      ` : ''}
      <div class="bulletin-content">
        <div class="bulletin-header">
          <div class="bulletin-meta">
            <span class="bulletin-category">
              <i class="fas fa-bullhorn"></i> Bulletin
            </span>
            <span class="bulletin-date">${formattedDate}</span>
          </div>
          <h3>${title || 'Untitled Bulletin'}</h3>
        </div>
        <p>${description || 'No description available.'}</p>
        <div class="bulletin-actions">
          ${bulletin.link ? `
            <a href="${bulletin.link}" target="_blank" class="bulletin-link">
              <i class="fas fa-external-link-alt"></i> Learn More
            </a>
          ` : ''}
          ${bulletin.contact_email ? `
            <a href="mailto:${bulletin.contact_email}" class="bulletin-contact-btn">
              <i class="fas fa-envelope"></i> Contact
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on and load appropriate data
  if (window.location.pathname.includes('events.html')) {
    window.refreshEventsPage?.();
  } else if (window.location.pathname.includes('bulletin')) {
    window.refreshBulletinsPage?.();
  }
});

console.info('[activities-list.js] Loaded. refreshEventsPage and refreshBulletinsPage available');


            </a>
          ` : ''}
          ${bulletin.contact_email ? `
            <a href="mailto:${bulletin.contact_email}" class="bulletin-contact-btn">
              <i class="fas fa-envelope"></i> Contact
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on and load appropriate data
  if (window.location.pathname.includes('events.html')) {
    window.refreshEventsPage?.();
  } else if (window.location.pathname.includes('bulletin')) {
    window.refreshBulletinsPage?.();
  }
});

console.info('[activities-list.js] Loaded. refreshEventsPage and refreshBulletinsPage available');

