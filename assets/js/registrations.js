// Registrations Management for MSME Owners
// Load and display registrations for events and bulletins

import { supabase } from './supabase-client.global.js';

export async function loadRegistrations() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated');
      return { events: [], bulletins: [] };
    }

    // Get user's businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    if (businessError || !businesses || businesses.length === 0) {
      console.log('No businesses found for user');
      return { events: [], bulletins: [] };
    }

    const businessIds = businesses.map(b => b.id);

    // Get events and bulletins for these businesses
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .in('business_id', businessIds);

    if (eventsError) {
      console.error('[registrations] Error loading events:', eventsError);
    }

    // Try business_id first, then owner_business_id, then owner_user_id
    let bulletins = null;
    let bulletinsError = null;
    
    // Try business_id first
    const { data: b1, error: e1 } = await supabase
      .from('bulletins')
      .select('id, title')
      .in('business_id', businessIds);
    
    if (!e1 && b1 && b1.length > 0) {
      bulletins = b1;
    } else {
      // Try owner_business_id
      const { data: b2, error: e2 } = await supabase
        .from('bulletins')
        .select('id, title')
        .in('owner_business_id', businessIds);
      
      if (!e2 && b2 && b2.length > 0) {
        bulletins = b2;
      } else {
        // Try to get bulletins by owner_user_id
        const { data: userBusinesses } = await supabase
          .from('businesses')
          .select('owner_id')
          .in('id', businessIds);
        
        if (userBusinesses && userBusinesses.length > 0) {
          const ownerIds = userBusinesses.map(b => b.owner_id).filter(Boolean);
          if (ownerIds.length > 0) {
            const { data: b3, error: e3 } = await supabase
              .from('bulletins')
              .select('id, title')
              .in('owner_user_id', ownerIds);
            if (!e3 && b3) bulletins = b3;
            if (e3) bulletinsError = e3;
          }
        }
        if (!bulletins) bulletinsError = e1 || e2;
      }
    }
    
    console.log('[registrations] Loaded items:', {
      eventCount: events?.length || 0,
      bulletinCount: bulletins?.length || 0,
      businessIds: businessIds
    });

    const eventIds = events?.map(e => e.id) || [];
    const bulletinIds = bulletins?.map(b => b.id) || [];

    // Get registrations for these events and bulletins
    let allRegistrations = [];

    if (eventIds.length > 0) {
      const { data: eventRegs, error: eventRegError } = await supabase
        .from('registrations')
        .select('*')
        .eq('type', 'event')
        .in('item_id', eventIds)
        .order('created_at', { ascending: false });

      // Handle 404 - table might not exist yet
      if (eventRegError) {
        if (eventRegError.code === 'PGRST116' || eventRegError.message?.includes('does not exist') || eventRegError.status === 404) {
          console.log('[registrations] Registrations table may not exist or no registrations found');
        } else {
          console.error('[registrations] Error loading event registrations:', eventRegError);
        }
      }

      if (!eventRegError && eventRegs) {
        // Fetch event titles
        const { data: eventTitles } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        
        const titleMap = {};
        eventTitles?.forEach(e => { titleMap[e.id] = e.title; });
        
        allRegistrations.push(...eventRegs.map(r => ({
          ...r,
          item_title: titleMap[r.item_id] || 'Unknown Event'
        })));
      }
    }

    if (bulletinIds.length > 0) {
      const { data: bulletinRegs, error: bulletinRegError } = await supabase
        .from('registrations')
        .select('*')
        .eq('type', 'bulletin')
        .in('item_id', bulletinIds)
        .order('created_at', { ascending: false });

      // Handle 404 - table might not exist yet
      if (bulletinRegError) {
        if (bulletinRegError.code === 'PGRST116' || bulletinRegError.message?.includes('does not exist') || bulletinRegError.status === 404) {
          console.log('[registrations] Registrations table may not exist or no registrations found');
        } else {
          console.error('[registrations] Error loading bulletin registrations:', bulletinRegError);
        }
      }

      if (!bulletinRegError && bulletinRegs) {
        // Fetch bulletin titles
        const { data: bulletinTitles } = await supabase
          .from('bulletins')
          .select('id, title')
          .in('id', bulletinIds);
        
        const titleMap = {};
        bulletinTitles?.forEach(b => { titleMap[b.id] = b.title; });
        
        allRegistrations.push(...bulletinRegs.map(r => ({
          ...r,
          item_title: titleMap[r.item_id] || 'Unknown Bulletin'
        })));
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
    const date = new Date(reg.created_at).toLocaleString();
    const statusClass = reg.status === 'pending' ? 'pending' : reg.status === 'approved' ? 'approved' : 'rejected';
    const statusIcon = reg.status === 'pending' ? '⏳' : reg.status === 'approved' ? '✅' : '❌';
    
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
          <div style="background: ${reg.status === 'pending' ? '#f59e0b' : reg.status === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            ${statusIcon} ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
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
        
        ${reg.status === 'pending' ? `
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
    const { error } = await supabase
      .from('registrations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', registrationId);

    if (error) throw error;

    // Reload registrations
    if (window.reloadRegistrations) {
      await window.reloadRegistrations();
    }
  } catch (error) {
    console.error('Error updating registration status:', error);
    alert('Failed to update registration status. Please try again.');
  }
};


import { supabase } from './supabase-client.global.js';

export async function loadRegistrations() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated');
      return { events: [], bulletins: [] };
    }

    // Get user's businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    if (businessError || !businesses || businesses.length === 0) {
      console.log('No businesses found for user');
      return { events: [], bulletins: [] };
    }

    const businessIds = businesses.map(b => b.id);

    // Get events and bulletins for these businesses
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .in('business_id', businessIds);

    if (eventsError) {
      console.error('[registrations] Error loading events:', eventsError);
    }

    // Try business_id first, then owner_business_id, then owner_user_id
    let bulletins = null;
    let bulletinsError = null;
    
    // Try business_id first
    const { data: b1, error: e1 } = await supabase
      .from('bulletins')
      .select('id, title')
      .in('business_id', businessIds);
    
    if (!e1 && b1 && b1.length > 0) {
      bulletins = b1;
    } else {
      // Try owner_business_id
      const { data: b2, error: e2 } = await supabase
        .from('bulletins')
        .select('id, title')
        .in('owner_business_id', businessIds);
      
      if (!e2 && b2 && b2.length > 0) {
        bulletins = b2;
      } else {
        // Try to get bulletins by owner_user_id
        const { data: userBusinesses } = await supabase
          .from('businesses')
          .select('owner_id')
          .in('id', businessIds);
        
        if (userBusinesses && userBusinesses.length > 0) {
          const ownerIds = userBusinesses.map(b => b.owner_id).filter(Boolean);
          if (ownerIds.length > 0) {
            const { data: b3, error: e3 } = await supabase
              .from('bulletins')
              .select('id, title')
              .in('owner_user_id', ownerIds);
            if (!e3 && b3) bulletins = b3;
            if (e3) bulletinsError = e3;
          }
        }
        if (!bulletins) bulletinsError = e1 || e2;
      }
    }
    
    console.log('[registrations] Loaded items:', {
      eventCount: events?.length || 0,
      bulletinCount: bulletins?.length || 0,
      businessIds: businessIds
    });

    const eventIds = events?.map(e => e.id) || [];
    const bulletinIds = bulletins?.map(b => b.id) || [];

    // Get registrations for these events and bulletins
    let allRegistrations = [];

    if (eventIds.length > 0) {
      const { data: eventRegs, error: eventRegError } = await supabase
        .from('registrations')
        .select('*')
        .eq('type', 'event')
        .in('item_id', eventIds)
        .order('created_at', { ascending: false });

      // Handle 404 - table might not exist yet
      if (eventRegError) {
        if (eventRegError.code === 'PGRST116' || eventRegError.message?.includes('does not exist') || eventRegError.status === 404) {
          console.log('[registrations] Registrations table may not exist or no registrations found');
        } else {
          console.error('[registrations] Error loading event registrations:', eventRegError);
        }
      }

      if (!eventRegError && eventRegs) {
        // Fetch event titles
        const { data: eventTitles } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        
        const titleMap = {};
        eventTitles?.forEach(e => { titleMap[e.id] = e.title; });
        
        allRegistrations.push(...eventRegs.map(r => ({
          ...r,
          item_title: titleMap[r.item_id] || 'Unknown Event'
        })));
      }
    }

    if (bulletinIds.length > 0) {
      const { data: bulletinRegs, error: bulletinRegError } = await supabase
        .from('registrations')
        .select('*')
        .eq('type', 'bulletin')
        .in('item_id', bulletinIds)
        .order('created_at', { ascending: false });

      // Handle 404 - table might not exist yet
      if (bulletinRegError) {
        if (bulletinRegError.code === 'PGRST116' || bulletinRegError.message?.includes('does not exist') || bulletinRegError.status === 404) {
          console.log('[registrations] Registrations table may not exist or no registrations found');
        } else {
          console.error('[registrations] Error loading bulletin registrations:', bulletinRegError);
        }
      }

      if (!bulletinRegError && bulletinRegs) {
        // Fetch bulletin titles
        const { data: bulletinTitles } = await supabase
          .from('bulletins')
          .select('id, title')
          .in('id', bulletinIds);
        
        const titleMap = {};
        bulletinTitles?.forEach(b => { titleMap[b.id] = b.title; });
        
        allRegistrations.push(...bulletinRegs.map(r => ({
          ...r,
          item_title: titleMap[r.item_id] || 'Unknown Bulletin'
        })));
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
    const date = new Date(reg.created_at).toLocaleString();
    const statusClass = reg.status === 'pending' ? 'pending' : reg.status === 'approved' ? 'approved' : 'rejected';
    const statusIcon = reg.status === 'pending' ? '⏳' : reg.status === 'approved' ? '✅' : '❌';
    
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
          <div style="background: ${reg.status === 'pending' ? '#f59e0b' : reg.status === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            ${statusIcon} ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
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
        
        ${reg.status === 'pending' ? `
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
    const { error } = await supabase
      .from('registrations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', registrationId);

    if (error) throw error;

    // Reload registrations
    if (window.reloadRegistrations) {
      await window.reloadRegistrations();
    }
  } catch (error) {
    console.error('Error updating registration status:', error);
    alert('Failed to update registration status. Please try again.');
  }
};
