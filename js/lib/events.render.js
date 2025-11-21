// /js/lib/events.render.js

/**
 * Render events list with consistent styling
 * @param {Array} items - Array of event objects
 * @param {Object} options - Render options
 * @param {HTMLElement|string} options.mount - Mount point element or selector
 * @param {string} options.emptyMessage - Message to show when no events
 * @param {string} options.cardClass - Additional CSS class for event cards
 */
export function renderEventsList(items, { 
  mount = document.querySelector('#events-list'), 
  emptyMessage = 'No events found.',
  cardClass = ''
} = {}) {
  if (!mount) {
    console.warn('[events] No mount point found for events list');
    return;
  }
  
  mount.innerHTML = '';

  if (!items || items.length === 0) {
    const div = document.createElement('div');
    div.className = 'text-muted text-sm p-4 border rounded text-center';
    div.style.cssText = 'color: #9ca3af; text-align: center; padding: 40px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px;';
    div.innerHTML = `
      <i class="fas fa-calendar-alt" style="font-size: 48px; margin-bottom: 16px; display: block; color: #4b5563;"></i>
      <h3 style="margin: 0 0 8px; color: #9ca3af;">${emptyMessage}</h3>
    `;
    mount.appendChild(div);
    return;
  }

  for (const ev of items) {
    const row = document.createElement('div');
    row.className = `event-row p-3 border-b ${cardClass}`;
    row.style.cssText = `
      background: #1a1a1a; 
      border: 1px solid #2a2a2a; 
      border-radius: 12px; 
      margin-bottom: 16px; 
      padding: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    const statusColor = ev.is_published ? '#10b981' : '#f59e0b';
    const statusText = ev.is_published ? 'Published' : 'Draft';
    
    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div class="font-semibold" style="color: #fff; font-size: 18px; font-weight: 600; line-height: 1.3;">
          ${ev.title ?? '(untitled)'}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${statusText}
          </span>
          ${ev.kind && ev.kind !== 'general' ? `
            <span style="background: #374151; color: #d1d5db; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${ev.kind}
            </span>
          ` : ''}
        </div>
      </div>
      
      ${ev.description ? `
        <div style="color: #d1d5db; font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
          ${ev.description.length > 150 ? ev.description.substring(0, 150) + '...' : ev.description}
        </div>
      ` : ''}
      
      <div style="display: flex; flex-wrap: wrap; gap: 16px; color: #9ca3af; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <i class="fas fa-clock"></i>
          <span>${new Date(ev.start_at).toLocaleString()}</span>
        </div>
        
        ${ev.end_at ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-calendar-check"></i>
            <span>Ends: ${new Date(ev.end_at).toLocaleString()}</span>
          </div>
        ` : ''}
        
        ${ev.location ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-map-marker-alt"></i>
            <span>${ev.location}</span>
          </div>
        ` : ''}
        
        ${ev.contact_phone ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-phone"></i>
            <span>${ev.contact_phone}</span>
          </div>
        ` : ''}
        
        ${ev.contact_email ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-envelope"></i>
            <span>${ev.contact_email}</span>
          </div>
        ` : ''}
      </div>
      
      ${ev.cover_image_url ? `
        <div style="margin-top: 12px;">
          <img src="${ev.cover_image_url}" alt="${ev.title}" 
               style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
        </div>
      ` : ''}
    `;
    
    // Add hover effect
    row.addEventListener('mouseenter', () => {
      row.style.transform = 'translateY(-2px)';
      row.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.transform = 'translateY(0)';
      row.style.boxShadow = 'none';
    });
    
    mount.appendChild(row);
  }
}

/**
 * Render events in a grid layout
 * @param {Array} items - Array of event objects
 * @param {Object} options - Render options
 */
export function renderEventsGrid(items, { 
  mount = document.querySelector('#events-grid'), 
  emptyMessage = 'No events found.',
  gridClass = 'grid-cards'
} = {}) {
  if (!mount) {
    console.warn('[events] No mount point found for events grid');
    return;
  }
  
  mount.innerHTML = '';
  mount.className = gridClass;

  if (!items || items.length === 0) {
    const div = document.createElement('div');
    div.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;';
    div.innerHTML = `
      <i class="fas fa-calendar-alt" style="font-size: 48px; margin-bottom: 16px; display: block; color: #4b5563;"></i>
      <h3 style="margin: 0 0 8px; color: #9ca3af;">${emptyMessage}</h3>
    `;
    mount.appendChild(div);
    return;
  }

  for (const ev of items) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.cssText = `
      background: #1a1a1a; 
      border: 1px solid #2a2a2a; 
      border-radius: 12px; 
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    const statusColor = ev.is_published ? '#10b981' : '#f59e0b';
    const statusText = ev.is_published ? 'Published' : 'Draft';
    
    card.innerHTML = `
      ${ev.cover_image_url ? `
        <div style="height: 200px; overflow: hidden;">
          <img src="${ev.cover_image_url}" alt="${ev.title}" 
               style="width: 100%; height: 100%; object-fit: cover;">
        </div>
      ` : `
        <div style="height: 200px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center; color: #111; font-size: 32px;">
          <i class="fas fa-calendar-alt"></i>
        </div>
      `}
      
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; font-weight: 600; line-height: 1.3;">
            ${ev.title ?? '(untitled)'}
          </h3>
          <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${statusText}
          </span>
        </div>
        
        ${ev.description ? `
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
            ${ev.description.length > 100 ? ev.description.substring(0, 100) + '...' : ev.description}
          </p>
        ` : ''}
        
        <div style="color: #9ca3af; font-size: 14px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <i class="fas fa-clock"></i>
            <span>${new Date(ev.start_at).toLocaleDateString()}</span>
          </div>
          
          ${ev.location ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <i class="fas fa-map-marker-alt"></i>
              <span>${ev.location}</span>
            </div>
          ` : ''}
        </div>
        
        ${ev.contact_phone || ev.contact_email ? `
          <div style="border-top: 1px solid #333; padding-top: 12px; color: #9ca3af; font-size: 12px;">
            ${ev.contact_phone ? `<div><i class="fas fa-phone"></i> ${ev.contact_phone}</div>` : ''}
            ${ev.contact_email ? `<div><i class="fas fa-envelope"></i> ${ev.contact_email}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
    
    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    });
    
    mount.appendChild(card);
  }
}
