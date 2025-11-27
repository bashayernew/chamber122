// UI Cards Extended - Event and Bulletin card rendering
export function eventCardPretty(e, showOwnerControls = false) {
  const coverImage = e.cover_image_url || e.cover_url || '';
  const locationParts = [e.governorate, e.area, e.street, e.block, e.floor].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : (e.location || '');
  const description = e.description ? (e.description.length > 100 ? e.description.substring(0, 100) + '...' : e.description) : '';
  
  // Format date range - exact format: "30 Nov, 15:12 – 30 Nov, 19:17"
  const formatDateRange = (start, end) => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const opts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    if (s && e) {
      const startStr = `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
      const endStr = `${e.getDate()} ${e.toLocaleString('en-US', { month: 'short' })}, ${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`;
      return `${startStr} – ${endStr}`;
    }
    if (s) {
      return `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
    }
    return '—';
  };
  
  return `
    <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; height: 100%; position: relative;"
       onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
      <!-- Business Profile Header (TOP) -->
      <div onclick="event.stopPropagation(); window.location.href='/owner.html?businessId=${e.business_id || ''}'" style="padding: 12px 16px; background: #0f0f0f; border-bottom: 1px solid #2a2a2a; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#151515'" onmouseout="this.style.background='#0f0f0f'">
        ${e.business_logo_url ? `<img src="${e.business_logo_url}" alt="${e.business_name || 'Business'}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; border: 1px solid #2a2a2a;">` : `<div style="width: 32px; height: 32px; border-radius: 6px; background: #374151; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px; font-weight: 600;">${(e.business_name || 'B').charAt(0).toUpperCase()}</div>`}
        <div style="flex: 1;">
          <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Organized by</div>
          <div style="color: #fff; font-size: 14px; font-weight: 600;">${e.business_name || 'Unknown Business'}</div>
        </div>
        <i class="fas fa-chevron-right" style="color: #6b7280; font-size: 12px;"></i>
      </div>
      
      <!-- Event Image -->
      <div onclick="event.stopPropagation(); if(typeof window.showEventDetails === 'function') { window.showEventDetails('${e.id}'); } else { window.location.href='/event.html?id=${encodeURIComponent(e.id)}'; }" style="cursor: pointer;">
        ${coverImage ? `
          <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
            <img src="${coverImage}" alt="${e.title || 'Event'}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-calendar-alt" style="color: #111; font-size: 48px;"></i>
          </div>
        `}
      </div>
      
      <!-- Event Content -->
      <div style="padding: 16px;">
        <h3 onclick="event.stopPropagation(); if(typeof window.showEventDetails === 'function') { window.showEventDetails('${e.id}'); } else { window.location.href='/event.html?id=${encodeURIComponent(e.id)}'; }" style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; line-height: 1.3; cursor: pointer;">${e.title || 'Untitled Event'}</h3>
        <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px;">
          ${formatDateRange(e.start_at, e.end_at)}
        </div>
        ${location ? `
          <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 16px;">
            ${location}
          </div>
        ` : ''}
        
        <!-- Action Buttons -->
        ${showOwnerControls ? `
          <!-- Owner Controls -->
          <div style="display: flex; gap: 4px; margin-top: 16px; flex-wrap: wrap;">
            ${(e.status === 'draft' || e.status === 'pending' || !e.is_published) ? `
              <button onclick="event.stopPropagation(); if(typeof window.publishEvent === 'function') { window.publishEvent('${e.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'" title="Publish">
                <i class="fas fa-eye"></i> Publish
              </button>
            ` : `
              <button onclick="event.stopPropagation(); if(typeof window.draftEvent === 'function') { window.draftEvent('${e.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #f59e0b; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'" title="Save as Draft">
                <i class="fas fa-eye-slash"></i> Draft
              </button>
            `}
            <button onclick="event.stopPropagation(); if(typeof window.editEvent === 'function') { window.editEvent('${e.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Edit">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="event.stopPropagation(); if(typeof window.deleteEvent === 'function') { window.deleteEvent('${e.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'" title="Delete">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        ` : `
          <!-- Public Action Buttons - Always show both -->
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button onclick="event.stopPropagation(); if(typeof window.showEventDetails === 'function') { window.showEventDetails('${e.id}'); } else { window.location.href='/event.html?id=${encodeURIComponent(e.id)}'; }" style="flex: 1; padding: 10px 16px; background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#333'; this.style.borderColor='#444'" onmouseout="this.style.background='#2a2a2a'; this.style.borderColor='#3a3a3a'">
              More Info
            </button>
            <button onclick="event.stopPropagation(); if(typeof window.showEventDetails === 'function') { window.showEventDetails('${e.id}'); } else { window.location.href='/event.html?id=${encodeURIComponent(e.id)}'; }" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #ffd166, #ffed4e); color: #111; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              Register
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

export function bulletinCardPretty(b, showOwnerControls = false) {
  const coverImage = b.image_url || b.cover_image_url || b.cover_url || '';
  const startDate = b.start_at || b.start_date || b.publish_at || b.created_at || null;
  const endDate = b.end_at || b.deadline_date || b.end_date || b.expire_at || null;
  const description = (b.content || b.body || b.description || '').substring(0, 100);
  const location = b.location || '';
  
  // Format date range - exact format: "30 Nov, 15:12 – 30 Nov, 19:17"
  const formatDateRange = (start, end) => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e) {
      const startStr = `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
      const endStr = `${e.getDate()} ${e.toLocaleString('en-US', { month: 'short' })}, ${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`;
      return `${startStr} – ${endStr}`;
    }
    if (s) {
      return `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
    }
    return '—';
  };
  
  return `
    <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; height: 100%; position: relative;"
       onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
      <!-- Business Profile Header (TOP) -->
      <div onclick="event.stopPropagation(); window.location.href='/owner.html?businessId=${b.business_id || ''}'" style="padding: 12px 16px; background: #0f0f0f; border-bottom: 1px solid #2a2a2a; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#151515'" onmouseout="this.style.background='#0f0f0f'">
        ${b.business_logo_url || b.logo_url ? `<img src="${b.business_logo_url || b.logo_url}" alt="${b.business_name || 'Business'}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; border: 1px solid #2a2a2a;">` : `<div style="width: 32px; height: 32px; border-radius: 6px; background: #374151; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px; font-weight: 600;">${(b.business_name || 'B').charAt(0).toUpperCase()}</div>`}
        <div style="flex: 1;">
          <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Posted by</div>
          <div style="color: #fff; font-size: 14px; font-weight: 600;">${b.business_name || 'Unknown Business'}</div>
        </div>
        <i class="fas fa-chevron-right" style="color: #6b7280; font-size: 12px;"></i>
      </div>
      
      <!-- Bulletin Image -->
      <div onclick="event.stopPropagation(); if(typeof window.showBulletinDetails === 'function') { window.showBulletinDetails('${b.id}'); } else { window.location.href='/bulletin.html?id=${encodeURIComponent(b.id)}'; }" style="cursor: pointer;">
        ${coverImage ? `
          <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
            <img src="${coverImage}" alt="${b.title || 'Bulletin'}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-bullhorn" style="color: #111; font-size: 48px;"></i>
          </div>
        `}
      </div>
      
      <!-- Bulletin Content -->
      <div style="padding: 16px;">
        <h3 onclick="event.stopPropagation(); if(typeof window.showBulletinDetails === 'function') { window.showBulletinDetails('${b.id}'); } else { window.location.href='/bulletin.html?id=${encodeURIComponent(b.id)}'; }" style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; line-height: 1.3; cursor: pointer;">${b.title ?? 'Announcement'}</h3>
        ${(startDate || endDate) ? `
          <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px;">
            ${formatDateRange(startDate, endDate)}
          </div>
        ` : ''}
        ${location ? `
          <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 16px;">
            ${location}
          </div>
        ` : ''}
        
        <!-- Action Buttons -->
        ${showOwnerControls ? `
          <!-- Owner Controls -->
          <div style="display: flex; gap: 4px; margin-top: 16px; flex-wrap: wrap;">
            ${(b.status === 'draft' || b.status === 'pending' || !b.is_published) ? `
              <button onclick="event.stopPropagation(); if(typeof window.publishBulletin === 'function') { window.publishBulletin('${b.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'" title="Publish">
                <i class="fas fa-eye"></i> Publish
              </button>
            ` : `
              <button onclick="event.stopPropagation(); if(typeof window.draftBulletin === 'function') { window.draftBulletin('${b.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #f59e0b; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'" title="Save as Draft">
                <i class="fas fa-eye-slash"></i> Draft
              </button>
            `}
            <button onclick="event.stopPropagation(); if(typeof window.editBulletin === 'function') { window.editBulletin('${b.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Edit">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="event.stopPropagation(); if(typeof window.deleteBulletin === 'function') { window.deleteBulletin('${b.id}'); } else { alert('Function not loaded'); }" style="flex: 1; padding: 8px 12px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'" title="Delete">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        ` : `
          <!-- Public Action Buttons - Always show both -->
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button onclick="event.stopPropagation(); if(typeof window.showBulletinDetails === 'function') { window.showBulletinDetails('${b.id}'); } else { window.location.href='/bulletin.html?id=${encodeURIComponent(b.id)}'; }" style="flex: 1; padding: 10px 16px; background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#333'; this.style.borderColor='#444'" onmouseout="this.style.background='#2a2a2a'; this.style.borderColor='#3a3a3a'">
              More Info
            </button>
            <button onclick="event.stopPropagation(); if(typeof window.showBulletinDetails === 'function') { window.showBulletinDetails('${b.id}'); } else { window.location.href='/bulletin.html?id=${encodeURIComponent(b.id)}'; }" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #ffd166, #ffed4e); color: #111; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              Register
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

