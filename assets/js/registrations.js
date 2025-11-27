// Registrations Management for MSME Owners
// Load and display registrations for events and bulletins using localStorage

import { getCurrentUser, getMyBusiness } from '/js/api.js';
import { getPublicEvents, getPublicBulletins } from '/js/api.js';

export async function loadRegistrations() {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error('User not authenticated');
      return { events: [], bulletins: [], all: [] };
    }

    // Get user's business
    const businessResponse = await getMyBusiness();
    console.log('[registrations] getMyBusiness response:', businessResponse);
    const business = businessResponse && businessResponse.business ? businessResponse.business : null;
    if (!business) {
      console.log('[registrations] No business found for user:', user.id);
      // Still try to load registrations by owner_id even if business is null
      // This allows users to see registrations even if business data is incomplete
    }

    const businessId = business ? business.id : null;

    // Get events for this business from localStorage
    const allEvents = await getPublicEvents();
    const events = allEvents.filter(e => {
      if (businessId && e.business_id === businessId) return true;
      if (e.owner_id === user.id) return true;
      return false;
    });
    
    // Also check localStorage for all events (including drafts)
    const storedEvents = localStorage.getItem('chamber122_events');
    if (storedEvents) {
      try {
        const allStoredEvents = JSON.parse(storedEvents);
        const draftEvents = allStoredEvents.filter(e => {
          const matchesBusiness = businessId && e.business_id === businessId;
          const matchesOwner = e.owner_id === user.id;
          const isDraft = !e.status || e.status !== 'published';
          return (matchesBusiness || matchesOwner) && isDraft;
        });
        events.push(...draftEvents);
      } catch (e) {
        console.warn('[registrations] Error parsing stored events:', e);
      }
    }

    // Get bulletins for this business from localStorage
    const allBulletins = await getPublicBulletins();
    const bulletins = allBulletins.filter(b => {
      if (businessId && b.business_id === businessId) return true;
      if (b.owner_id === user.id) return true;
      return false;
    });
    
    // Also check localStorage for all bulletins (including drafts)
    const storedBulletins = localStorage.getItem('chamber122_bulletins');
    if (storedBulletins) {
      try {
        const allStoredBulletins = JSON.parse(storedBulletins);
        const draftBulletins = allStoredBulletins.filter(b => {
          const matchesBusiness = businessId && b.business_id === businessId;
          const matchesOwner = b.owner_id === user.id;
          const isDraft = !b.status || b.status !== 'published';
          return (matchesBusiness || matchesOwner) && isDraft;
        });
        bulletins.push(...draftBulletins);
      } catch (e) {
        console.warn('[registrations] Error parsing stored bulletins:', e);
      }
    }

    console.log('[registrations] Loaded items:', {
      eventCount: events?.length || 0,
      bulletinCount: bulletins?.length || 0,
      businessId: businessId
    });

    const eventIds = events?.map(e => e.id) || [];
    const bulletinIds = bulletins?.map(b => b.id) || [];

    // Get registrations from localStorage
    let allRegistrations = [];

    // Load event registrations from localStorage
    const eventRegistrationsStr = localStorage.getItem('chamber122_event_registrations');
    if (eventRegistrationsStr) {
      try {
        const eventRegistrations = JSON.parse(eventRegistrationsStr);
        const myEventRegistrations = eventRegistrations.filter(r => eventIds.includes(r.event_id));
        myEventRegistrations.forEach(r => {
          const event = events.find(e => e.id === r.event_id);
          allRegistrations.push({
            ...r,
            type: 'event',
            item_id: r.event_id,
            item_title: event ? event.title : 'Unknown Event'
          });
        });
      } catch (e) {
        console.warn('[registrations] Error parsing event registrations:', e);
      }
    }

    // Load bulletin registrations from localStorage
    const bulletinRegistrationsStr = localStorage.getItem('chamber122_bulletin_registrations');
    if (bulletinRegistrationsStr) {
      try {
        const bulletinRegistrations = JSON.parse(bulletinRegistrationsStr);
        const myBulletinRegistrations = bulletinRegistrations.filter(r => bulletinIds.includes(r.bulletin_id));
        myBulletinRegistrations.forEach(r => {
          const bulletin = bulletins.find(b => b.id === r.bulletin_id);
          allRegistrations.push({
            ...r,
            type: 'bulletin',
            item_id: r.bulletin_id,
            item_title: bulletin ? bulletin.title : 'Unknown Bulletin'
          });
        });
      } catch (e) {
        console.warn('[registrations] Error parsing bulletin registrations:', e);
      }
    }

    // Separate by type
    const eventRegistrations = allRegistrations.filter(r => r.type === 'event');
    const bulletinRegistrations = allRegistrations.filter(r => r.type === 'bulletin');

    return {
      events: eventRegistrations,
      bulletins: bulletinRegistrations,
      all: allRegistrations
    };
  } catch (error) {
    console.error('Error loading registrations:', error);
    return { events: [], bulletins: [], all: [] };
  }
}

export function renderRegistrations(container, registrations) {
  if (!registrations || registrations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #AFAFAF;">
        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p style="font-size: 16px;">No registrations yet</p>
        <p style="font-size: 14px; margin-top: 8px; color: #666;">Registrations will appear here when people sign up for your events or respond to your bulletins.</p>
      </div>
    `;
    return;
  }

  const html = registrations.map(reg => {
    const date = reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown date';
    const status = reg.status || 'pending';
    const statusClass = status === 'pending' ? 'pending' : status === 'approved' ? 'approved' : 'rejected';
    const statusIcon = status === 'pending' ? '⏳' : status === 'approved' ? '✅' : '❌';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
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
          </div>
          <div style="background: ${status === 'pending' ? '#f59e0b' : status === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            ${statusIcon} ${statusText}
          </div>
        </div>
        
        <div style="background: #0f0f0f; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
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
          ${reg.message ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #2a2a2a;">
            <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 4px;">Message</div>
            <div style="color: #fff; font-size: 14px; line-height: 1.5;">${reg.message}</div>
          </div>
          ` : ''}
        </div>
        
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// updateRegistrationStatus function removed - no approve/reject buttons needed
