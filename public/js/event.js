import { getEventById } from '/js/api.js';

(async function () {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const el = document.getElementById('event');

  if (!id) { el.innerHTML = '<p>Missing event id.</p>'; return; }
  
  // Show loading message
  el.innerHTML = '<p style="text-align:center; padding:40px; color:#aaa;">Loading event details...</p>';

  console.log('[event-detail] Starting event detail loading for ID:', id);

  try {
    const data = await getEventById(id);

    if (!data) { 
      console.log('[event-detail] No event data found for ID:', id);
      el.innerHTML = '<p>Event not found.</p>'; 
      return; 
    }

    console.log('[event-detail] Loaded event data:', data);

    const startDate = data.start_at ? new Date(data.start_at) : null;
    const endDate = data.end_at ? new Date(data.end_at) : null;
    const startTime = startDate && !isNaN(startDate) ? startDate.toLocaleString() : 'TBA';
    const endTime = endDate && !isNaN(endDate) ? endDate.toLocaleString() : null;

    el.innerHTML = `
      <article class="event-detail" style="max-width:800px; margin:0 auto; background:#1a1a1a; border-radius:12px; overflow:hidden; border:1px solid #2a2a2a;">
        <div style="height:300px; background:linear-gradient(135deg, #ffd166, #ff6b6b); position:relative; display:flex; align-items:center; justify-content:center;">
          ${data.cover_image_url ? 
            `<img src="${data.cover_image_url}" alt="${data.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div style="display:none; color:#111; font-size:64px; align-items:center; justify-content:center; width:100%; height:100%; background:linear-gradient(135deg, #ffd166, #ff6b6b);"><i class="fas fa-calendar-alt"></i></div>` :
            `<div style="color:#111; font-size:64px; display:flex; align-items:center; justify-content:center; width:100%; height:100%;"><i class="fas fa-calendar-alt"></i></div>`
          }
        </div>
        <div style="padding:30px;">
          <h1 style="margin:0 0 16px; font-size:32px; font-weight:700; color:#fff;">${data.title || 'Untitled Event'}</h1>
          <div style="margin-bottom:20px; color:#ffd166; font-size:18px; font-weight:600;">
            <div style="margin-bottom:8px;">
              <i class="fas fa-clock" style="margin-right:8px;"></i>
              <strong>Start:</strong> ${startTime}
            </div>
            ${endTime ? `
              <div>
                <i class="fas fa-clock" style="margin-right:8px;"></i>
                <strong>End:</strong> ${endTime}
              </div>
            ` : ''}
          </div>
          ${data.location ? `
            <div style="margin-bottom:20px; color:#aaa; font-size:16px;">
              <i class="fas fa-map-marker-alt" style="margin-right:8px;"></i>
              ${data.location}
            </div>
          ` : `
            <div style="margin-bottom:20px; color:#666; font-size:16px;">
              <i class="fas fa-map-marker-alt" style="margin-right:8px;"></i>
              Location not specified
            </div>
          `}
          <div style="margin-bottom:30px; color:#ccc; font-size:16px; line-height:1.6;">
            ${(data.description || 'No description provided.').replace(/\n/g,'<br>')}
          </div>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:30px;">
            ${data.link ? `<a href="${data.link}" target="_blank" rel="noopener" style="background:#ffd166; color:#111; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:8px;"><i class="fas fa-external-link-alt"></i>Register</a>` : ''}
          </div>
          ${data.business_name ? `
            <div style="border-top:1px solid #2a2a2a; padding-top:20px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.location.href='/owner.html?businessId=${data.business_id || ''}'">
              ${data.business_logo_url ? `<img src="${data.business_logo_url}" alt="${data.business_name}" style="width:48px; height:48px; border-radius:8px; object-fit:cover;">` : ''}
              <div>
                <div style="color:#888; font-size:14px; margin-bottom:4px;">Hosted by</div>
                <div style="color:#fff; font-size:18px; font-weight:600;">${data.business_name || 'Unknown Business'}</div>
              </div>
            </div>
          ` : ''}
        </div>
      </article>`;
  } catch (error) {
    console.error('[event-detail] Error loading event:', error);
    el.innerHTML = '<p style="text-align:center; padding:40px; color:#f44;">Error loading event: ' + (error.message || 'Unknown error') + '</p>';
  }
})();
