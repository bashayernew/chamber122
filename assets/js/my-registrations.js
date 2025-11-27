// assets/js/my-registrations.js - Load and display user's own registrations
import { getCurrentUser } from '/js/api.js';
import { getPublicEvents, getPublicBulletins, getEventById, getBulletinById } from '/js/api.js';

export async function loadMyRegistrations() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { events: [], bulletins: [], all: [] };
    }

    const userId = user.id;

    // Load event registrations
    const eventRegistrationsStr = localStorage.getItem('chamber122_event_registrations');
    const eventRegistrations = eventRegistrationsStr ? JSON.parse(eventRegistrationsStr) : [];
    console.log('[my-registrations] All event registrations:', eventRegistrations.length);
    const myEventRegistrations = eventRegistrations.filter(r => {
      const matchesUserId = r.user_id === userId;
      const matchesEmail = r.email === user.email;
      console.log('[my-registrations] Checking registration:', { regUserId: r.user_id, userId, matchesUserId, regEmail: r.email, userEmail: user.email, matchesEmail });
      return matchesUserId || matchesEmail;
    });
    console.log('[my-registrations] My event registrations:', myEventRegistrations.length);

    // Load bulletin registrations
    const bulletinRegistrationsStr = localStorage.getItem('chamber122_bulletin_registrations');
    const bulletinRegistrations = bulletinRegistrationsStr ? JSON.parse(bulletinRegistrationsStr) : [];
    console.log('[my-registrations] All bulletin registrations:', bulletinRegistrations.length);
    const myBulletinRegistrations = bulletinRegistrations.filter(r => {
      const matchesUserId = r.user_id === userId;
      const matchesEmail = r.email === user.email;
      return matchesUserId || matchesEmail;
    });
    console.log('[my-registrations] My bulletin registrations:', myBulletinRegistrations.length);

    // Get event/bulletin details for each registration
    const allEvents = await getPublicEvents();
    const allBulletins = await getPublicBulletins();
    
    // Also check localStorage for all events/bulletins (including drafts)
    const storedEvents = localStorage.getItem('chamber122_events');
    const allStoredEvents = storedEvents ? JSON.parse(storedEvents) : [];
    const allEventsCombined = [...allEvents, ...allStoredEvents];
    
    const storedBulletins = localStorage.getItem('chamber122_bulletins');
    const allStoredBulletins = storedBulletins ? JSON.parse(storedBulletins) : [];
    const allBulletinsCombined = [...allBulletins, ...allStoredBulletins];

    const eventRegsWithDetails = myEventRegistrations.map(reg => {
      const event = allEventsCombined.find(e => e.id === reg.event_id);
      return {
        ...reg,
        type: 'event',
        item_title: event ? event.title : 'Unknown Event',
        item_description: event ? event.description : '',
        item_start: event ? event.start_at : null,
        item_end: event ? event.end_at : null,
        item_location: event ? event.location : '',
        item_business_name: event ? event.business_name : ''
      };
    });

    const bulletinRegsWithDetails = myBulletinRegistrations.map(reg => {
      const bulletin = allBulletinsCombined.find(b => b.id === reg.bulletin_id);
      return {
        ...reg,
        type: 'bulletin',
        item_title: bulletin ? bulletin.title : 'Unknown Bulletin',
        item_description: bulletin ? bulletin.body || bulletin.content || bulletin.description : '',
        item_start: bulletin ? (bulletin.start_at || bulletin.start_date || bulletin.publish_at) : null,
        item_end: bulletin ? (bulletin.end_at || bulletin.deadline_date || bulletin.end_date) : null,
        item_location: bulletin ? bulletin.location : '',
        item_business_name: bulletin ? bulletin.business_name : ''
      };
    });

    const allRegistrations = [...eventRegsWithDetails, ...bulletinRegsWithDetails].sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA; // Newest first
    });

    return {
      events: eventRegsWithDetails,
      bulletins: bulletinRegsWithDetails,
      all: allRegistrations
    };
  } catch (error) {
    console.error('[my-registrations] Error loading registrations:', error);
    return { events: [], bulletins: [], all: [] };
  }
}

export function renderMyRegistrations(container, registrations) {
  if (!registrations || registrations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #AFAFAF;">
        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p style="font-size: 16px;">No registrations yet</p>
        <p style="font-size: 14px; margin-top: 8px; color: #666;">Your registrations for events and bulletins will appear here.</p>
      </div>
    `;
    return;
  }

  const html = registrations.map(reg => {
    const date = reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown date';
    const itemDate = reg.item_start ? new Date(reg.item_start).toLocaleDateString() : '';
    
    return `
      <div class="registration-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <span style="font-size: 20px;">${reg.type === 'event' ? '📅' : '📢'}</span>
              <h3 style="color: #fff; font-size: 18px; font-weight: 600; margin: 0;">${reg.item_title || 'Unknown'}</h3>
            </div>
            <div style="color: #f2c64b; font-size: 14px; margin-bottom: 12px;">
              ${reg.type === 'event' ? 'Event Registration' : 'Bulletin Response'}
            </div>
            ${reg.item_business_name ? `
              <div style="color: #AFAFAF; font-size: 13px; margin-bottom: 8px;">
                <i class="fas fa-building"></i> ${reg.item_business_name}
              </div>
            ` : ''}
            ${itemDate ? `
              <div style="color: #AFAFAF; font-size: 13px; margin-bottom: 8px;">
                <i class="fas fa-calendar"></i> ${itemDate}
              </div>
            ` : ''}
            ${reg.item_location ? `
              <div style="color: #AFAFAF; font-size: 13px; margin-bottom: 8px;">
                <i class="fas fa-map-marker-alt"></i> ${reg.item_location}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="background: #0f0f0f; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 8px;">Your Registration Details</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            <div>
              <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 4px;">Name</div>
              <div style="color: #fff; font-size: 14px; font-weight: 500;">${reg.name}</div>
            </div>
            <div>
              <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 4px;">Email</div>
              <div style="color: #fff; font-size: 14px;">
                <a href="mailto:${reg.email}" style="color: #06B6D4; text-decoration: none;">${reg.email}</a>
              </div>
            </div>
            ${reg.phone ? `
            <div>
              <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 4px;">Phone</div>
              <div style="color: #fff; font-size: 14px;">
                <a href="tel:${reg.phone}" style="color: #06B6D4; text-decoration: none;">${reg.phone}</a>
              </div>
            </div>
            ` : ''}
            <div>
              <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 4px;">Registered</div>
              <div style="color: #AFAFAF; font-size: 14px;">${date}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

