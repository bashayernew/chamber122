// js/owner.js - Load and display business data
import { supabase } from '../public/js/supabase-client.global.js';
import { fetchEvents } from './lib/events.fetch.js';

// Ensure supabase is available on window for events.fetch.js
if (typeof window !== 'undefined' && supabase) {
  window.__supabaseClient = supabase;
  window.supabase = supabase; // Also set for legacy compatibility
}

console.log('[owner] Loading business display script');

async function loadAndDisplayBusiness() {
  console.log('[owner] Loading business data...');
  
  try {
    // Check URL for businessId parameter (for viewing other businesses)
    const urlParams = new URLSearchParams(window.location.search);
    const businessIdFromUrl = urlParams.get('businessId');
    
    // Explicitly select all fields to ensure we get everything
    let query = supabase
      .from('businesses')
      .select('id, name, owner_id, industry, category, country, city, area, block, street, floor, office_no, description, short_description, story, phone, whatsapp, website, instagram, logo_url, is_active, created_at, updated_at');
    
    if (businessIdFromUrl) {
      // Load specific business by ID
      query = query.eq('id', businessIdFromUrl).single();
    } else {
      // Load current user's business
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[owner] No user, redirecting to auth');
        location.href = '/auth.html';
        return;
      }
      
      console.log('[owner] User ID:', user.id);
      query = query.eq('owner_id', user.id).maybeSingle();
    }
    
    let biz, error;
    try {
      const result = await query;
      biz = result.data;
      error = result.error;
    } catch (err) {
      console.error('[owner] Query exception:', err);
      error = err;
      biz = null;
    }
    
    // Handle 406 error or no business found
    if (error) {
      // Check if it's a 406 error or "no rows" error
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.log('[owner] No business found for user (406 or no rows)');
        // Redirect to form page to create business
        if (confirm('No business profile found. Would you like to create one?')) {
          window.location.href = '/owner-form.html';
        }
        return;
      }
      console.error('[owner] Error fetching business:', error);
      return;
    }
    
    if (!biz) {
      console.log('[owner] No business found - redirecting to form');
      if (confirm('No business profile found. Would you like to create one?')) {
        window.location.href = '/owner-form.html';
      }
      return;
    }
    
    console.log('[owner] Business loaded:', biz.name);
    console.log('[owner] Business data from database:', biz);
    
    // Helper function for safe values
    const val = (x, fallback = '—') => (x && String(x).trim().length ? x : fallback);
    
    // Populate all fields (use correct IDs from HTML)
    const $ = (id) => document.getElementById(id);
    
    // Business name and info
    if ($('biz-name')) $('biz-name').textContent = biz.name || 'Your Business';
    
    // Description and Story
    const descEl = $('description');
    if (descEl) {
      const descText = val(biz.description || biz.short_description, 'No description yet...');
      descEl.textContent = descText;
      console.log('[owner] Setting description:', descText.substring(0, 50) + '...');
    }
    
    const storyEl = $('story');
    if (storyEl) {
      const storyText = val(biz.story, 'No story yet...');
      storyEl.textContent = storyText;
      console.log('[owner] Setting story:', storyText.substring(0, 50) + '...');
    }
    
    // Contact fields
    const phoneEl = $('phone');
    if (phoneEl) {
      const phoneVal = val(biz.phone, 'Not provided');
      if (phoneEl.tagName === 'A') {
        phoneEl.textContent = phoneVal;
        phoneEl.href = biz.phone ? `tel:${biz.phone}` : '#';
      } else {
        phoneEl.textContent = phoneVal;
      }
    }
    
    const whatsappEl = $('whatsapp');
    if (whatsappEl) {
      const whatsappVal = val(biz.whatsapp, 'Not provided');
      if (whatsappEl.tagName === 'A') {
        whatsappEl.textContent = whatsappVal;
        whatsappEl.href = biz.whatsapp ? `https://wa.me/${biz.whatsapp.replace(/[^0-9]/g, '')}` : '#';
      } else {
        whatsappEl.textContent = whatsappVal;
      }
    }
    
    const websiteEl = $('website');
    if (websiteEl) {
      const websiteVal = val(biz.website, 'Not provided');
      if (websiteEl.tagName === 'A') {
        websiteEl.textContent = websiteVal;
        websiteEl.href = biz.website || '#';
      } else {
        websiteEl.textContent = websiteVal;
      }
    }
    
    const instagramEl = $('instagram');
    if (instagramEl) {
      const instagramVal = val(biz.instagram, 'Not provided');
      if (instagramEl.tagName === 'A') {
        instagramEl.textContent = instagramVal;
        instagramEl.href = biz.instagram ? `https://instagram.com/${biz.instagram.replace(/^@/, '')}` : '#';
      } else {
        instagramEl.textContent = instagramVal;
      }
    }
    
    // Location fields
    if ($('country')) {
      $('country').textContent = val(biz.country, 'Kuwait');
    }
    if ($('city')) {
      $('city').textContent = val(biz.city);
    }
    if ($('area')) {
      $('area').textContent = val(biz.area);
    }
    if ($('block')) {
      $('block').textContent = val(biz.block);
    }
    if ($('street')) {
      $('street').textContent = val(biz.street);
    }
    if ($('floor')) {
      $('floor').textContent = val(biz.floor);
    }
    if ($('office_no')) {
      $('office_no').textContent = val(biz.office_no);
    }
    if ($('industry')) {
      $('industry').textContent = val(biz.industry || biz.category);
    }
    
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

  // Use unified fetch for owner events (shows all events including drafts)
  const { data: allEvents, error } = await fetchEvents({ 
    scope: 'owner', 
    kind: 'all', 
    upcomingOnly: false 
  });

  if (error) {
    console.error('[owner-events] error loading events:', error);
    renderCards('ongoing-list', []);
    renderCards('past-list', []);
    return;
  }

  // Filter by business IDs and categorize
  const ownerEvents = allEvents.filter(event => bizIds.includes(event.business_id));
  
  const ongoing = ownerEvents.filter(e => 
    e.start_at <= nowIso && (e.end_at >= nowIso || !e.end_at)
  );
  
  const past = ownerEvents.filter(e => 
    e.end_at ? e.end_at < nowIso : e.start_at < nowIso
  ).slice(0, 20);

  renderCards('ongoing-list', ongoing);
  renderCards('past-list', past);
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

  // Use unified fetch for owner events (shows all events including drafts)
  const { data: allEvents, error } = await fetchEvents({ 
    scope: 'owner', 
    kind: 'all', 
    upcomingOnly: false 
  });

  if (error) {
    console.error('[owner-events] error loading events:', error);
    renderCards('ongoing-list', []);
    renderCards('past-list', []);
    return;
  }

  // Filter by business IDs and categorize
  const ownerEvents = allEvents.filter(event => bizIds.includes(event.business_id));
  
  const ongoing = ownerEvents.filter(e => 
    e.start_at <= nowIso && (e.end_at >= nowIso || !e.end_at)
  );
  
  const past = ownerEvents.filter(e => 
    e.end_at ? e.end_at < nowIso : e.start_at < nowIso
  ).slice(0, 20);

  renderCards('ongoing-list', ongoing);
  renderCards('past-list', past);
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

