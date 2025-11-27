export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function formatDateRange(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  if (s && e) return `${s.toLocaleString([], opts)} – ${e.toLocaleString([], opts)}`;
  if (s) return s.toLocaleString([], opts);
  return '—';
}

export function eventCard(e, showRegistration = false) {
  // Support both cover_url and cover_image_url
  const coverImage = e.cover_url || e.cover_image_url || '';
  // Build location from various fields
  const locationParts = [e.governorate, e.area, e.street, e.block, e.floor].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : (e.location || '');
  
  // Check if event is ongoing (can register)
  const now = new Date();
  const isOngoing = (!e.start_at || new Date(e.start_at) <= now) && (!e.end_at || new Date(e.end_at) >= now);
  
  return el(`
    <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; cursor: pointer; height: 100%; position: relative;"
       onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
      <a href="/event.html?id=${encodeURIComponent(e.id)}" style="text-decoration: none; color: inherit; display: block;">
        ${coverImage ? `
          <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
            <img src="${coverImage}" alt="${e.title || 'Event'}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-calendar-alt" style="color: #111; font-size: 48px;"></i>
          </div>
        `}
        <div style="padding: 16px;">
          <h3 style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">${e.title ?? 'Untitled Event'}</h3>
          <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-clock" style="font-size: 10px;"></i>
            <span>${formatDateRange(e.start_at, e.end_at)}</span>
          </div>
          ${location ? `
            <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-map-marker-alt" style="font-size: 10px;"></i>
              <span>${location}</span>
            </div>
          ` : ''}
          ${e.description ? `
            <p style="color: #AFAFAF; font-size: 13px; line-height: 1.5; margin: 8px 0 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}
            </p>
          ` : ''}
        </div>
      </a>
      ${showRegistration && isOngoing ? `
        <div style="padding: 0 16px 16px 16px;">
          <button onclick="event.stopPropagation(); window.registerForEvent('${e.id}')" 
                  style="width: 100%; padding: 10px; background: linear-gradient(135deg, #f2c64b, #f59e0b); color: #111; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                  onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(242,198,75,0.3)';"
                  onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
            Register Now
          </button>
        </div>
      ` : ''}
    </div>
  `);
}

export function bulletinCard(b, showRegistration = false) {
  // Support both cover_url and cover_image_url, and both date field variants
  const coverImage = b.cover_url || b.cover_image_url || '';
  const startDate = b.start_at || b.start_date || b.publish_at || null;
  const endDate = b.end_at || b.deadline_date || b.end_date || b.expire_at || null;
  const description = b.content || b.description || b.body || '';
  const location = b.location || '';
  
  // Check if bulletin is ongoing (can register)
  const now = new Date();
  const isOngoing = (!startDate || new Date(startDate) <= now) && (!endDate || new Date(endDate) >= now);
  
  return el(`
    <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; cursor: pointer; height: 100%; position: relative;"
       onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
      <a href="/bulletin.html?id=${encodeURIComponent(b.id)}" style="text-decoration: none; color: inherit; display: block;">
        ${coverImage ? `
          <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
            <img src="${coverImage}" alt="${b.title || 'Bulletin'}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-bullhorn" style="color: #111; font-size: 48px;"></i>
          </div>
        `}
        <div style="padding: 16px;">
          <h3 style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">${b.title ?? 'Announcement'}</h3>
          ${(startDate || endDate) ? `
            <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-clock" style="font-size: 10px;"></i>
              <span>${formatDateRange(startDate, endDate)}</span>
            </div>
          ` : ''}
          ${location ? `
            <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-map-marker-alt" style="font-size: 10px;"></i>
              <span>${location}</span>
            </div>
          ` : ''}
          ${description ? `
            <p style="color: #AFAFAF; font-size: 13px; line-height: 1.5; margin: 8px 0 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}
            </p>
          ` : ''}
        </div>
      </a>
      ${showRegistration && isOngoing ? `
        <div style="padding: 0 16px 16px 16px;">
          <button onclick="event.stopPropagation(); window.registerForBulletin('${b.id}')" 
                  style="width: 100%; padding: 10px; background: linear-gradient(135deg, #f2c64b, #f59e0b); color: #111; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                  onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(242,198,75,0.3)';"
                  onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
            Register Now
          </button>
        </div>
      ` : ''}
    </div>
  `);
}

export function renderList(container, items, cardFn, empty = 'Nothing to show yet.') {
  if (!container) {
    console.warn('[renderList] Container not found');
    return;
  }
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #AFAFAF; padding: 40px; font-size: 14px;">${empty}</div>`;
    return;
  }
  const wrap = el(`<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;"></div>`);
  items.forEach(i => {
    if (!i || !i.id) {
      console.warn('[renderList] Skipping invalid item:', i);
      return;
    }
    const card = cardFn(i);
    if (typeof card === 'string') {
      wrap.innerHTML += card;
    } else if (card) {
      wrap.appendChild(card);
    }
  });
  container.appendChild(wrap);
}

