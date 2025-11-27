// Registrations Management for MSME Owners
// Load and display registrations for events and bulletins

import { getCurrentUser, getMyBusiness } from '/js/api.js';

export async function loadRegistrations() {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error('User not authenticated');
      return { events: [], bulletins: [], all: [] };
    }

    // Get user's business
    const business = await getMyBusiness();
    if (!business) {
      console.log('No business found for user');
      return { events: [], bulletins: [], all: [] };
    }

    const businessId = business.id;

    // Get events for this business
    const eventsRes = await fetch(`/api/dashboard/my-events`, {
      credentials: 'include'
    });
    const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
    const events = eventsData.events || [];

    // Get bulletins for this business
    const bulletinsRes = await fetch(`/api/dashboard/my-bulletins`, {
      credentials: 'include'
    });
    const bulletinsData = bulletinsRes.ok ? await bulletinsRes.json() : { bulletins: [] };
    const bulletins = bulletinsData.bulletins || [];

    console.log('[registrations] Loaded items:', {
      eventCount: events?.length || 0,
      bulletinCount: bulletins?.length || 0,
      businessId: businessId
    });

    const eventIds = events?.map(e => e.id) || [];
    const bulletinIds = bulletins?.map(b => b.id) || [];

    // Get registrations for these events and bulletins
    let allRegistrations = [];

    // Load event registrations
    for (const eventId of eventIds) {
      try {
        const regRes = await fetch(`/api/dashboard/registrations/${eventId}`, {
          credentials: 'include'
        });
        if (regRes.ok) {
          const regData = await regRes.json();
          const registrations = regData.registrations || [];
          const eventTitle = events.find(e => e.id === eventId)?.title || 'Unknown Event';
          allRegistrations.push(...registrations.map(r => ({
            ...r,
            type: 'event',
            item_id: eventId,
            item_title: eventTitle
          })));
        }
      } catch (err) {
        console.error(`[registrations] Error loading registrations for event ${eventId}:`, err);
      }
    }

    // Load bulletin registrations
    for (const bulletinId of bulletinIds) {
      try {
        const regRes = await fetch(`/api/dashboard/bulletin-registrations/${bulletinId}`, {
          credentials: 'include'
        });
        if (regRes.ok) {
          const regData = await regRes.json();
          const registrations = regData.registrations || [];
          const bulletinTitle = bulletins.find(b => b.id === bulletinId)?.title || 'Unknown Bulletin';
          allRegistrations.push(...registrations.map(r => ({
            ...r,
            type: 'bulletin',
            item_id: bulletinId,
            item_title: bulletinTitle
          })));
        }
      } catch (err) {
        console.error(`[registrations] Error loading registrations for bulletin ${bulletinId}:`, err);
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
        
        ${status === 'pending' ? `
        <div style="display: flex; gap: 8px;">
          <button onclick="updateRegistrationStatus('${reg.id}', 'approved')" 
                  style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.3s;"
                  onmouseover="this.style.opacity='0.9'"
                  onmouseout="this.style.opacity='1'">
            ✓ Approve
          </button>
          <button onclick="updateRegistrationStatus('${reg.id}', 'rejected')" 
                  style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.3s;"
                  onmouseover="this.style.opacity='0.9'"
                  onmouseout="this.style.opacity='1'">
            ✗ Reject
          </button>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Make updateRegistrationStatus available globally
window.updateRegistrationStatus = async function(registrationId, status) {
  try {
    // TODO: Implement registration status update endpoint
    // For now, just reload registrations
    console.log('[registrations] Status update not yet implemented with backend API');
    
    // Reload registrations
    if (window.reloadRegistrations) {
      await window.reloadRegistrations();
    }
  } catch (error) {
    console.error('Error updating registration status:', error);
    alert('Failed to update registration status. Please try again.');
  }
};
