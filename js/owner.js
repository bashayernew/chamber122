// js/owner.js - Load and display business data
import { supabase } from '../public/js/supabase-client.global.js';

console.log('[owner] Loading business display script');

async function loadAndDisplayBusiness() {
  console.log('[owner] Loading business data...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[owner] No user, redirecting to auth');
      location.href = '/auth.html';
      return;
    }
    
    console.log('[owner] User ID:', user.id);
    
    const { data: biz, error } = await supabase
    .from('businesses')
    .select('*')
      .eq('owner_id', user.id)
      .single();
    
    if (error) {
      console.error('[owner] Error fetching business:', error);
      return;
    }
    
    if (!biz) {
      console.log('[owner] No business found');
      return;
    }
    
    console.log('[owner] Business loaded:', biz.name);
    
    // Populate all fields (use correct IDs from HTML)
    const $ = (id) => document.getElementById(id);
    
    // Business name and info
    if ($('biz-name')) $('biz-name').textContent = biz.name || 'Your Business';
    if ($('description')) $('description').textContent = biz.description || 'No description yet';
    if ($('story')) $('story').textContent = biz.story || 'No story yet';
    
    // Contact fields
    if ($('phone')) {
      $('phone').textContent = biz.phone || 'Not provided';
      $('phone').href = biz.phone ? `tel:${biz.phone}` : '#';
    }
    if ($('whatsapp')) {
      $('whatsapp').textContent = biz.whatsapp || 'Not provided';
      $('whatsapp').href = biz.whatsapp ? `https://wa.me/${biz.whatsapp.replace(/[^0-9]/g, '')}` : '#';
    }
    if ($('website')) {
      $('website').textContent = biz.website || 'Not provided';
      $('website').href = biz.website || '#';
    }
    if ($('instagram')) {
      $('instagram').textContent = biz.instagram || 'Not provided';
      $('instagram').href = biz.instagram ? `https://instagram.com/${biz.instagram}` : '#';
    }
    
    // Location fields
    if ($('country')) $('country').textContent = biz.country || '';
    if ($('city')) $('city').textContent = biz.city || '';
    if ($('area')) $('area').textContent = biz.area || '';
    if ($('block')) $('block').textContent = biz.block || '';
    if ($('street')) $('street').textContent = biz.street || '';
    if ($('floor')) $('floor').textContent = biz.floor || '';
    if ($('office_no')) $('office_no').textContent = biz.office_no || '';
    if ($('industry')) $('industry').textContent = biz.industry || '';
    
    // Logo - CORRECT ID is "biz-logo"
    if (biz.logo_url) {
      const logoImg = $('biz-logo');
      if (logoImg) {
        console.log('[owner] Setting logo URL:', biz.logo_url);
        logoImg.src = biz.logo_url;
        logoImg.style.display = 'block';
        console.log('[owner] Logo element updated');
      } else {
        console.error('[owner] Logo element #biz-logo not found!');
      }
    } else {
      console.log('[owner] No logo_url in business data');
    }
    
    // Load gallery images
    await loadGalleryImages(biz.id);
    
    console.log('[owner] Business data displayed successfully');
    
  } catch (error) {
    console.error('[owner] Error loading business:', error);
  }
}

// Load gallery images
async function loadGalleryImages(businessId) {
  console.log('[owner] Loading gallery for business:', businessId);
  
  try {
    const { data, error } = await supabase
      .from('business_media')
      .select('id, url')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[owner] Error loading gallery:', error);
      return;
    }
    
    console.log('[owner] Gallery items found:', data?.length || 0);
    
    const galleryDiv = document.getElementById('gallery');
    if (!galleryDiv) {
      console.log('[owner] Gallery container not found');
      return;
    }
    
    if (!data || data.length === 0) {
      galleryDiv.innerHTML = '<p style="color:#94a3b8;text-align:center;">No images yet. Edit your profile to add gallery images.</p>';
      return;
    }
    
    // Clear and render gallery
    galleryDiv.innerHTML = '';
    
    data.forEach((item, index) => {
      console.log('[owner] Rendering gallery image', index + 1, ':', item.url);
      
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'gallery-item';
      imgWrapper.style.cssText = 'position:relative;overflow:hidden;border-radius:8px;';
      
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = `Gallery image ${index + 1}`;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onload = () => console.log('[owner] Gallery image loaded:', item.url);
      img.onerror = () => console.error('[owner] Gallery image failed to load:', item.url);
      
      imgWrapper.appendChild(img);
      galleryDiv.appendChild(imgWrapper);
    });
    
    console.log('[owner] Gallery rendered with', data.length, 'images');
    
  } catch (error) {
    console.error('[owner] Error in loadGalleryImages:', error);
  }
}

// Events loading functions
function fmt(dt) {
  return new Date(dt).toLocaleString();
}

// tiny renderer
function renderCards(targetId, rows) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!rows?.length) { 
    target.innerHTML = '<p class="muted">No items yet.</p>'; 
    return; 
  }
  target.innerHTML = rows.map(r => `
    <article class="card" style="padding:12px;margin:8px 0;display:flex;gap:12px;align-items:center;">
      ${r.cover_image_url ? `<img src="${r.cover_image_url}" alt="" style="width:68px;height:48px;object-fit:cover;border-radius:8px;">` : ''}
      <div style="flex:1">
        <div style="font-weight:600">${r.title || 'Untitled event'}</div>
        <div class="muted" style="font-size:.9rem">${fmt(r.start_at)}${r.end_at ? ' – ' + fmt(r.end_at) : ''}</div>
      </div>
      <a href="/events.html?id=${r.id}" class="btn btn-sm">View</a>
    </article>
  `).join('');
}

async function getOwnerBusinessIds(userId) {
  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId);
  if (error) { 
    console.error('[owner-events] businesses error', error); 
    return []; 
  }
  return (data || []).map(x => x.id);
}

export async function loadOwnerEvents() {
  console.log('[owner-events] Loading owner events...');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) { 
    console.warn('[owner-events] not signed in'); 
    return; 
  }

  const bizIds = await getOwnerBusinessIds(user.id);
  if (!bizIds.length) { 
    renderCards('ongoing-list', []); 
    renderCards('past-list', []); 
    return; 
  }

  const nowIso = new Date().toISOString();

  // Ongoing = started and not finished yet (or no end)
  const { data: ongoing, error: ongoingErr } = await supabase
    .from('events')
    .select('id,title,start_at,end_at,cover_image_url,status,is_published,deleted_at,business_id,businesses:business_id(name,logo_url)')
    .in('business_id', bizIds)
    .eq('is_published', true)
    .is('deleted_at', null)
    .or(
      // (start <= now AND end >= now) OR (start <= now AND end IS NULL)
      `and(start_at.lte.${nowIso},end_at.gte.${nowIso}),and(start_at.lte.${nowIso},end_at.is.null)`
    )
    .order('start_at', { ascending: true });

  if (ongoingErr) console.error('[owner-events] ongoing error', ongoingErr);
  renderCards('ongoing-list', ongoing || []);

  // Past = ended before now OR (no end and start < now)
  const { data: past, error: pastErr } = await supabase
    .from('events')
    .select('id,title,start_at,end_at,cover_image_url,status,is_published,deleted_at,business_id,businesses:business_id(name,logo_url)')
    .in('business_id', bizIds)
    .eq('is_published', true)
    .is('deleted_at', null)
    .or(
      `end_at.lt.${nowIso},and(end_at.is.null,start_at.lt.${nowIso})`
    )
    .order('end_at', { ascending: false, nullsFirst: false })
    .limit(20);

  if (pastErr) console.error('[owner-events] past error', pastErr);
  renderCards('past-list', past || []);
}

// Listen for refresh notifications from events page
window.addEventListener('storage', (e) => {
  if (e.key === 'owner-events-refresh') {
    console.log('[owner-events] Refresh notification received, reloading events...');
    loadOwnerEvents();
  }
});

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayBusiness();
    loadOwnerEvents();
  });
} else {
  loadAndDisplayBusiness();
  loadOwnerEvents();
}

