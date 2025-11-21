// ---- Setup ----
import { supabase } from './supabase-client.global.js';

console.log('[owner-form] Loading version 10 - Using global client');

const sb = supabase;
const $ = s => document.querySelector(s);

let currentBusinessId = null;
let existingMedia = [];      // [{id, url}]
let removedMediaIds = new Set();
let newFiles = [];           // File[]

// Helper functions
function getExt(name='') { 
  return (name.split('.').pop() || 'jpg').toLowerCase(); 
}

async function uploadPublic(bucket, path, file) {
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---- Gallery Management ----
async function loadExistingGallery(businessId) {
  console.log('Loading existing gallery for business:', businessId);
  
  const { data, error } = await sb
    .from('business_media')
    // Select only existing columns
    .select('id, url, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadExistingGallery error', error);
    return;
  }

  console.log('Gallery data from database:', data);

  // Use the url field directly
  const normalized = (data || []).map(r => ({
    id: r.id,
    url: r.url || ''
  })).filter(r => !!r.url);

  console.log('Normalized gallery data:', normalized);

  existingMedia = normalized;
  renderGallery();
}

function renderGallery() {
  const wrap = document.getElementById('galleryPreview');
  if (!wrap) {
    console.error('Gallery preview container not found!');
    return;
  }
  
  console.log('Rendering gallery with', existingMedia.length, 'existing images and', newFiles.length, 'new files');
  console.log('Removed media IDs:', Array.from(removedMediaIds));
  
  wrap.classList.add('gallery-grid');
  wrap.innerHTML = '';
  
  // Ensure it's visible
  wrap.style.display = 'grid';

  // Show message if no images
  if (existingMedia.length === 0 && newFiles.length === 0) {
    const noImagesMsg = document.createElement('div');
    noImagesMsg.textContent = 'No images yet. Select files below to add them.';
    noImagesMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;';
    wrap.appendChild(noImagesMsg);
    return;
  }

  // Existing (keep × button)
  for (const m of existingMedia) {
    if (removedMediaIds.has(m.id)) {
      console.log('Skipping removed image:', m.id);
      continue;
    }

    console.log('Rendering existing image:', m.id, m.url);

    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = m.url;
    img.alt = 'Gallery image';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.onload = () => console.log('Image loaded successfully:', m.url);
    img.onerror = () => {
      console.error('Image failed to load:', m.url);
      item.style.display = 'none';
    };
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.type = 'button'; // Prevent form submission
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Removing image:', m.id);
      removedMediaIds.add(m.id);
      renderGallery();
    };
    item.appendChild(btn);

    wrap.appendChild(item);
  }

  // New files preview
  for (const f of newFiles) {
    console.log('Rendering new file:', f.name);

    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(f);
    img.src = objectUrl;
    img.alt = f.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    // Clean up object URL when image is removed
    item.dataset.objectUrl = objectUrl;
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.type = 'button'; // Prevent form submission
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Removing new file:', f.name);
      // Clean up object URL
      if (item.dataset.objectUrl) {
        URL.revokeObjectURL(item.dataset.objectUrl);
      }
      newFiles = newFiles.filter(x => x !== f);
      renderGallery();
    };
    item.appendChild(btn);

    wrap.appendChild(item);
  }
  
  console.log('Gallery rendered with', wrap.children.length, 'items');
}

function wireGalleryInputs() {
  const galleryFilesInput = document.getElementById('galleryFiles');
  if (!galleryFilesInput) {
    console.error('Gallery files input not found!');
    return;
  }
  
  console.log('Wiring gallery inputs...');
  
  // Remove any existing listeners to prevent duplicates
  const newInput = galleryFilesInput.cloneNode(true);
  galleryFilesInput.parentNode.replaceChild(newInput, galleryFilesInput);
  
  newInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    console.log('Files selected:', files.length, files.map(f => f.name));
    
    // Check MAX_GALLERY limit (existing + new)
    const MAX_GALLERY = 5;
    const currentTotal = existingMedia.length - removedMediaIds.size + newFiles.length;
    const remainingSlots = Math.max(0, MAX_GALLERY - currentTotal);
    
    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more image(s). Maximum ${MAX_GALLERY} images allowed.`);
      const filesToAdd = files.slice(0, remainingSlots);
      newFiles = [...newFiles, ...filesToAdd];
    } else {
      newFiles = [...newFiles, ...files];
    }
    
    console.log('Total new files now:', newFiles.length);
    console.log('Total existing images:', existingMedia.length - removedMediaIds.size);
    
    renderGallery();
    // reset input so selecting same file again still triggers change
    e.target.value = '';
  });
}

// ---- Save Gallery Changes ----
async function saveGalleryChanges() {
  if (!currentBusinessId) {
    console.log('No currentBusinessId, skipping gallery save');
    return;
  }

  console.log('Saving gallery changes for business:', currentBusinessId);
  console.log('Removed media IDs:', Array.from(removedMediaIds));
  console.log('New files to upload:', newFiles.length);

  // 1) Delete removed
  if (removedMediaIds.size > 0) {
    const ids = Array.from(removedMediaIds);
    console.log('Deleting media IDs:', ids);
    const { error: delErr } = await sb
      .from('business_media')
      .delete()
      .in('id', ids);
    if (delErr) {
      console.error('Delete media error', delErr);
      // keep going; don't block uploads
    } else {
      console.log('Successfully deleted', ids.length, 'media items');
    }
  }

  // 2) Upload new files to storage and insert rows
  for (const file of newFiles) {
    console.log('Uploading file:', file.name);
    const ext = getExt(file.name);
    const path = `${currentBusinessId}/gallery/${crypto.randomUUID()}.${ext}`;
    console.log('Upload path:', path);

    // upload to public bucket
    const { data: up, error: upErr } = await sb.storage
      .from('business-assets')
      .upload(path, file, { upsert: false });
    if (upErr) {
      console.error('Upload error for', file.name, upErr);
      continue;
    }
    console.log('File uploaded successfully:', file.name);

    // get public URL
    const { data: pub } = sb.storage
      .from('business-assets')
      .getPublicUrl(path);

    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      console.error('No public URL for', file.name);
      continue;
    }
    console.log('Public URL:', publicUrl);

    const { error: insErr } = await sb
      .from('business_media')
      .insert({
        business_id: currentBusinessId,
        url: publicUrl,
        file_path: path
      });

    if (insErr) {
      console.error('Insert media error for', file.name, insErr);
    } else {
      console.log('Media inserted successfully for', file.name);
    }
  }

  // 3) Reset local state & reload
  removedMediaIds.clear();
  newFiles = [];
  await loadExistingGallery(currentBusinessId);
}

// ---- Main Form Functions ----
async function preloadEdit() {
  console.log('Starting preloadEdit...');
  
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    console.log('No user found, redirecting to auth');
    return location.assign('/auth.html');
  }

  console.log('User found:', user.id);

  // Fix 406 error by properly handling the query and error response
  // Try with explicit headers and proper error handling
  let biz, bizError;
  try {
    const result = await sb
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    biz = result.data;
    bizError = result.error;
  } catch (err) {
    console.error('[owner-form] Query exception:', err);
    bizError = err;
    biz = null;
  }
  
  if (bizError) {
    console.error('[owner-form] Error loading business:', bizError);
    // Check if it's a 406 error specifically
    if (bizError.code === 'PGRST301' || bizError.message?.includes('406') || bizError.message?.includes('Not Acceptable')) {
      console.warn('[owner-form] 406 error detected, trying alternative query...');
      // Try a simpler query
      const altResult = await sb
        .from('businesses')
        .select('id, name, owner_id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!altResult.error && altResult.data) {
        // If we got a partial result, try to get full data by ID
        const fullResult = await sb
          .from('businesses')
          .select('*')
          .eq('id', altResult.data.id)
          .single();
        if (!fullResult.error) {
          biz = fullResult.data;
          bizError = null;
        }
      }
    }
    
    if (bizError && !biz) {
      alert('Error loading business profile: ' + (bizError.message || bizError.code || 'Unknown error'));
      console.error('[owner-form] Full error:', bizError);
      return;
    }
  }
  
  if (!biz) {
    console.log('No business found for user - creating new business...');
    // Try to create a business if it doesn't exist
    const { data: newBiz, error: createError } = await sb
      .from('businesses')
      .insert({ owner_id: user.id, name: 'My Business' })
      .select()
      .single();
    
    if (createError || !newBiz) {
      console.error('[owner-form] Error creating business:', createError);
      alert('Unable to create business profile. Please contact support.');
      return;
    }
    
    console.log('[owner-form] Created new business:', newBiz.id);
    // Use the newly created business
    const bizToUse = newBiz;
    currentBusinessId = bizToUse.id;
    
    // Fill form with empty/default values
    const fieldMap = {
      name: 'name',
      phone: 'phone', 
      whatsapp: 'whatsapp',
      website: 'website',
      instagram: 'instagram',
      country: 'country',
      city: 'city',
      area: 'area',
      block: 'block',
      street: 'street',
      floor: 'floor',
      office_no: 'office_no',
      industry: 'industry',
      description: 'description',
      story: 'story'
    };
    
    Object.entries(fieldMap).forEach(([col, id]) => {
      const el = document.getElementById(id);
      if (el && bizToUse[col] != null) el.value = bizToUse[col];
    });
    
    await loadExistingGallery(currentBusinessId);
    wireGalleryInputs();
    setupSaveHandler();
    return;
  }

  console.log('Business found:', biz.id, biz.name);
  currentBusinessId = biz.id;

  // Fill your text inputs here
  const fieldMap = {
    name: 'name',
    phone: 'phone', 
    whatsapp: 'whatsapp',
    website: 'website',
    instagram: 'instagram',
    country: 'country',
    city: 'city',
    area: 'area',
    block: 'block',
    street: 'street',
    floor: 'floor',
    office_no: 'office_no',
    industry: 'industry',
    description: 'description',
    story: 'story'
  };

  Object.entries(fieldMap).forEach(([col, id]) => {
    const el = document.getElementById(id);
    if (el && biz[col] != null) el.value = biz[col];
  });

  // Logo preview
  const logoPreview = document.getElementById('logoPreview');
  if (logoPreview) {
    if (biz.logo_url) {
      // Ensure logo_url is a full URL (handle both full URLs and relative paths)
      let logoUrl = biz.logo_url;
      if (logoUrl && !logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
        // If it's a relative path or just a filename, construct the full URL
        // Check if it's a Supabase storage URL pattern
        if (logoUrl.includes('business-assets') || logoUrl.includes('supabase.co')) {
          // Already a storage URL, use as is
        } else {
          // Try to get public URL from storage
          const pathMatch = logoUrl.match(/([^\/]+)\/([^\/]+\.(png|jpg|jpeg|gif|webp))/i);
          if (pathMatch) {
            const { data } = sb.storage.from('business-assets').getPublicUrl(logoUrl);
            logoUrl = data?.publicUrl || biz.logo_url;
          }
        }
      }
      
      console.log('[owner-form] Setting logo preview URL:', logoUrl);
      logoPreview.src = logoUrl;
      logoPreview.style.display = 'block';
      logoPreview.style.visibility = 'visible';
      logoPreview.style.opacity = '1';
      logoPreview.style.width = 'auto';
      logoPreview.style.height = 'auto';
      logoPreview.style.maxWidth = '100%';
      logoPreview.style.maxHeight = '100%';
      
      logoPreview.onload = () => {
        console.log('[owner-form] Logo preview loaded successfully from:', logoUrl);
      };
      logoPreview.onerror = (e) => {
        console.error('[owner-form] Failed to load logo:', logoUrl, e);
        // Try alternative URL construction
        if (logoUrl !== biz.logo_url) {
          console.log('[owner-form] Trying original URL:', biz.logo_url);
          logoPreview.src = biz.logo_url;
        } else {
          logoPreview.alt = 'Logo failed to load';
          logoPreview.style.display = 'none';
        }
      };
    } else {
      console.log('[owner-form] No logo URL in business data');
      logoPreview.src = '';
      logoPreview.alt = 'No logo uploaded';
      logoPreview.style.display = 'none';
    }
  } else {
    console.warn('[owner-form] Logo preview element not found');
  }

  // Load existing gallery
  await loadExistingGallery(currentBusinessId);

  // Wire up gallery inputs
  wireGalleryInputs();

  // Logo handler
  const logoInput = document.getElementById('logo');
  if (logoInput) {
    logoInput.addEventListener('change', e => {
      const f = e.target.files?.[0]; 
      if (!f) {
        console.log('[owner-form] No file selected');
        return;
      }
      console.log('[owner-form] Logo file selected:', f.name, f.type);
      const logoPreview = document.getElementById('logoPreview');
      if (logoPreview) {
        // Clean up previous object URL if any
        if (logoPreview.dataset.objectUrl) {
          URL.revokeObjectURL(logoPreview.dataset.objectUrl);
        }
        
        const objectUrl = URL.createObjectURL(f);
        logoPreview.src = objectUrl;
        logoPreview.dataset.objectUrl = objectUrl;
        logoPreview.style.display = 'block';
        logoPreview.style.visibility = 'visible';
        logoPreview.style.opacity = '1';
        logoPreview.alt = 'Logo preview';
        console.log('[owner-form] Logo preview updated');
        
        logoPreview.onload = () => {
          console.log('[owner-form] Logo preview loaded from file');
        };
        logoPreview.onerror = () => {
          console.error('[owner-form] Failed to load logo preview from file');
        };
      } else {
        console.error('[owner-form] Logo preview element not found');
      }
    });
  } else {
    console.warn('[owner-form] Logo input element not found');
  }

  // Setup save handler
  setupSaveHandler();
  
  // Setup real-time subscription for profile updates
  setupRealtimeUpdates(currentBusinessId);
}

// Setup save handler function (only once)
let saveHandlerSetup = false;

function setupSaveHandler() {
  if (saveHandlerSetup) {
    console.log('[owner-form] Save handler already setup, skipping');
    return;
  }
  
  const saveBtn = document.getElementById('saveBtn');
  const form = document.getElementById('biz-form');
  
  if (!saveBtn || !form) {
    console.error('[owner-form] Save button or form not found!');
    return;
  }
  
  // Add event listeners (only once)
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[owner-form] Save button clicked');
    saveProfile(e);
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('[owner-form] Form submitted');
    saveProfile(e);
  });
  
  saveHandlerSetup = true;
  console.log('[owner-form] Save handler setup complete');
}

// Setup real-time updates for profile changes
function setupRealtimeUpdates(businessId) {
  if (!businessId) return;
  
  // Subscribe to business updates
  const businessChannel = sb
    .channel(`business:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'businesses',
        filter: `id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Business updated via real-time:', payload);
        // Reload the form data
        window.location.reload();
      }
    )
    .subscribe();
  
  // Subscribe to events for this business
  const eventsChannel = sb
    .channel(`business-events:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `business_id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Event changed for business:', payload);
        // Trigger page refresh or update UI
        if (window.updateEventsDisplay) {
          window.updateEventsDisplay();
        }
      }
    )
    .subscribe();
  
  // Subscribe to bulletins for this business
  const bulletinsChannel = sb
    .channel(`business-bulletins:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bulletins',
        filter: `business_id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Bulletin changed for business:', payload);
        // Trigger page refresh or update UI
        if (window.updateBulletinsDisplay) {
          window.updateBulletinsDisplay();
        }
      }
    )
    .subscribe();
  
  // Subscribe to registrations for this business's events/bulletins
  const registrationsChannel = sb
    .channel(`business-registrations:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'registrations'
      },
      async (payload) => {
        console.log('[owner-form] New registration:', payload);
        // Check if registration is for this business's events/bulletins
        const reg = payload.new;
        // This will be handled by checking if the item_id belongs to this business
        if (window.updateRegistrationsDisplay) {
          window.updateRegistrationsDisplay();
        }
      }
    )
    .subscribe();
  
  // Store channels for cleanup
  window.realtimeChannels = window.realtimeChannels || [];
  window.realtimeChannels.push(businessChannel, eventsChannel, bulletinsChannel, registrationsChannel);
}

// Save handler
async function saveProfile(ev){
    ev.preventDefault();
    console.log('Save profile called');
    
    const updates = {
      name: $('#name')?.value || null,
      phone: $('#phone')?.value || null,
      whatsapp: $('#whatsapp')?.value || null,
      website: $('#website')?.value || null,
      instagram: $('#instagram')?.value || null,
      country: $('#country')?.value || null,
      city: $('#city')?.value || null,
      area: $('#area')?.value || null,
      block: $('#block')?.value || null,
      street: $('#street')?.value || null,
      floor: $('#floor')?.value || null,
      office_no: $('#office_no')?.value || null,
      industry: $('#industry')?.value || null,
      description: $('#description')?.value || null,
      story: $('#story')?.value || null,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updates to save:', updates);

    // Logo upload
    const logoEl = $('#logo');
    if (logoEl?.files?.[0]) {
      const f = logoEl.files[0];
      const path = `${currentBusinessId}/logo.${getExt(f.name)}`;
      console.log('[owner-form] Uploading logo file:', f.name, 'to path:', path);
      alert('Uploading logo: ' + f.name);
      
      try { 
        const logoUrl = await uploadPublic('business-assets', path, f);
        updates.logo_url = logoUrl;
        console.log('[owner-form] Logo uploaded successfully to:', logoUrl);
        alert('Logo uploaded! URL: ' + logoUrl);
      }
      catch (e){ 
        alert('Logo upload failed: ' + e.message); 
        console.error('[owner-form] Logo upload error:', e); 
        return; 
      }
    } else {
      console.log('[owner-form] No new logo file selected - logo unchanged');
    }

    // Update business row
    console.log('[owner-form] Updating business with ID:', currentBusinessId);
    console.log('[owner-form] Full update payload:', updates);
    
    const { data: updatedBiz, error: updErr } = await sb
      .from('businesses')
      .update(updates)
      .eq('id', currentBusinessId)
      .select();
    
    if (updErr) { 
      alert('Save failed: ' + updErr.message); 
      console.error('[owner-form] Business update error:', updErr); 
      console.error('[owner-form] Error details:', {
        message: updErr.message,
        code: updErr.code,
        details: updErr.details,
        hint: updErr.hint
      });
      return; 
    }
    
    console.log('[owner-form] Business updated successfully!');
    console.log('[owner-form] Updated business data:', updatedBiz);
    
    // Show what was saved
    if (updatedBiz && updatedBiz[0]) {
      alert('Saved! Logo URL in database: ' + (updatedBiz[0].logo_url || 'none'));
    }

    // Save gallery changes
    console.log('[owner-form] Saving gallery changes...');
    await saveGalleryChanges();
    console.log('[owner-form] Gallery changes saved');

    alert('All saved! Redirecting to owner.html...');
    location.href = '/owner.html';
  }

document.addEventListener('DOMContentLoaded', preloadEdit);
    country: 'country',
    city: 'city',
    area: 'area',
    block: 'block',
    street: 'street',
    floor: 'floor',
    office_no: 'office_no',
    industry: 'industry',
    description: 'description',
    story: 'story'
  };

  Object.entries(fieldMap).forEach(([col, id]) => {
    const el = document.getElementById(id);
    if (el && biz[col] != null) el.value = biz[col];
  });

  // Logo preview
  const logoPreview = document.getElementById('logoPreview');
  if (logoPreview) {
    if (biz.logo_url) {
      // Ensure logo_url is a full URL (handle both full URLs and relative paths)
      let logoUrl = biz.logo_url;
      if (logoUrl && !logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
        // If it's a relative path or just a filename, construct the full URL
        // Check if it's a Supabase storage URL pattern
        if (logoUrl.includes('business-assets') || logoUrl.includes('supabase.co')) {
          // Already a storage URL, use as is
        } else {
          // Try to get public URL from storage
          const pathMatch = logoUrl.match(/([^\/]+)\/([^\/]+\.(png|jpg|jpeg|gif|webp))/i);
          if (pathMatch) {
            const { data } = sb.storage.from('business-assets').getPublicUrl(logoUrl);
            logoUrl = data?.publicUrl || biz.logo_url;
          }
        }
      }
      
      console.log('[owner-form] Setting logo preview URL:', logoUrl);
      logoPreview.src = logoUrl;
      logoPreview.style.display = 'block';
      logoPreview.style.visibility = 'visible';
      logoPreview.style.opacity = '1';
      logoPreview.style.width = 'auto';
      logoPreview.style.height = 'auto';
      logoPreview.style.maxWidth = '100%';
      logoPreview.style.maxHeight = '100%';
      
      logoPreview.onload = () => {
        console.log('[owner-form] Logo preview loaded successfully from:', logoUrl);
      };
      logoPreview.onerror = (e) => {
        console.error('[owner-form] Failed to load logo:', logoUrl, e);
        // Try alternative URL construction
        if (logoUrl !== biz.logo_url) {
          console.log('[owner-form] Trying original URL:', biz.logo_url);
          logoPreview.src = biz.logo_url;
        } else {
          logoPreview.alt = 'Logo failed to load';
          logoPreview.style.display = 'none';
        }
      };
    } else {
      console.log('[owner-form] No logo URL in business data');
      logoPreview.src = '';
      logoPreview.alt = 'No logo uploaded';
      logoPreview.style.display = 'none';
    }
  } else {
    console.warn('[owner-form] Logo preview element not found');
  }

  // Load existing gallery
  await loadExistingGallery(currentBusinessId);

  // Wire up gallery inputs
  wireGalleryInputs();

  // Logo handler
  const logoInput = document.getElementById('logo');
  if (logoInput) {
    logoInput.addEventListener('change', e => {
      const f = e.target.files?.[0]; 
      if (!f) {
        console.log('[owner-form] No file selected');
        return;
      }
      console.log('[owner-form] Logo file selected:', f.name, f.type);
      const logoPreview = document.getElementById('logoPreview');
      if (logoPreview) {
        // Clean up previous object URL if any
        if (logoPreview.dataset.objectUrl) {
          URL.revokeObjectURL(logoPreview.dataset.objectUrl);
        }
        
        const objectUrl = URL.createObjectURL(f);
        logoPreview.src = objectUrl;
        logoPreview.dataset.objectUrl = objectUrl;
        logoPreview.style.display = 'block';
        logoPreview.style.visibility = 'visible';
        logoPreview.style.opacity = '1';
        logoPreview.alt = 'Logo preview';
        console.log('[owner-form] Logo preview updated');
        
        logoPreview.onload = () => {
          console.log('[owner-form] Logo preview loaded from file');
        };
        logoPreview.onerror = () => {
          console.error('[owner-form] Failed to load logo preview from file');
        };
      } else {
        console.error('[owner-form] Logo preview element not found');
      }
    });
  } else {
    console.warn('[owner-form] Logo input element not found');
  }

  // Setup save handler
  setupSaveHandler();
  
  // Setup real-time subscription for profile updates
  setupRealtimeUpdates(currentBusinessId);
}

// Setup save handler function (only once)
let saveHandlerSetup = false;

function setupSaveHandler() {
  if (saveHandlerSetup) {
    console.log('[owner-form] Save handler already setup, skipping');
    return;
  }
  
  const saveBtn = document.getElementById('saveBtn');
  const form = document.getElementById('biz-form');
  
  if (!saveBtn || !form) {
    console.error('[owner-form] Save button or form not found!');
    return;
  }
  
  // Add event listeners (only once)
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[owner-form] Save button clicked');
    saveProfile(e);
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('[owner-form] Form submitted');
    saveProfile(e);
  });
  
  saveHandlerSetup = true;
  console.log('[owner-form] Save handler setup complete');
}

// Setup real-time updates for profile changes
function setupRealtimeUpdates(businessId) {
  if (!businessId) return;
  
  // Subscribe to business updates
  const businessChannel = sb
    .channel(`business:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'businesses',
        filter: `id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Business updated via real-time:', payload);
        // Reload the form data
        window.location.reload();
      }
    )
    .subscribe();
  
  // Subscribe to events for this business
  const eventsChannel = sb
    .channel(`business-events:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `business_id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Event changed for business:', payload);
        // Trigger page refresh or update UI
        if (window.updateEventsDisplay) {
          window.updateEventsDisplay();
        }
      }
    )
    .subscribe();
  
  // Subscribe to bulletins for this business
  const bulletinsChannel = sb
    .channel(`business-bulletins:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bulletins',
        filter: `business_id=eq.${businessId}`
      },
      (payload) => {
        console.log('[owner-form] Bulletin changed for business:', payload);
        // Trigger page refresh or update UI
        if (window.updateBulletinsDisplay) {
          window.updateBulletinsDisplay();
        }
      }
    )
    .subscribe();
  
  // Subscribe to registrations for this business's events/bulletins
  const registrationsChannel = sb
    .channel(`business-registrations:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'registrations'
      },
      async (payload) => {
        console.log('[owner-form] New registration:', payload);
        // Check if registration is for this business's events/bulletins
        const reg = payload.new;
        // This will be handled by checking if the item_id belongs to this business
        if (window.updateRegistrationsDisplay) {
          window.updateRegistrationsDisplay();
        }
      }
    )
    .subscribe();
  
  // Store channels for cleanup
  window.realtimeChannels = window.realtimeChannels || [];
  window.realtimeChannels.push(businessChannel, eventsChannel, bulletinsChannel, registrationsChannel);
}

// Save handler
async function saveProfile(ev){
    ev.preventDefault();
    console.log('Save profile called');
    
    const updates = {
      name: $('#name')?.value || null,
      phone: $('#phone')?.value || null,
      whatsapp: $('#whatsapp')?.value || null,
      website: $('#website')?.value || null,
      instagram: $('#instagram')?.value || null,
      country: $('#country')?.value || null,
      city: $('#city')?.value || null,
      area: $('#area')?.value || null,
      block: $('#block')?.value || null,
      street: $('#street')?.value || null,
      floor: $('#floor')?.value || null,
      office_no: $('#office_no')?.value || null,
      industry: $('#industry')?.value || null,
      description: $('#description')?.value || null,
      story: $('#story')?.value || null,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updates to save:', updates);

    // Logo upload
    const logoEl = $('#logo');
    if (logoEl?.files?.[0]) {
      const f = logoEl.files[0];
      const path = `${currentBusinessId}/logo.${getExt(f.name)}`;
      console.log('[owner-form] Uploading logo file:', f.name, 'to path:', path);
      alert('Uploading logo: ' + f.name);
      
      try { 
        const logoUrl = await uploadPublic('business-assets', path, f);
        updates.logo_url = logoUrl;
        console.log('[owner-form] Logo uploaded successfully to:', logoUrl);
        alert('Logo uploaded! URL: ' + logoUrl);
      }
      catch (e){ 
        alert('Logo upload failed: ' + e.message); 
        console.error('[owner-form] Logo upload error:', e); 
        return; 
      }
    } else {
      console.log('[owner-form] No new logo file selected - logo unchanged');
    }

    // Update business row
    console.log('[owner-form] Updating business with ID:', currentBusinessId);
    console.log('[owner-form] Full update payload:', updates);
    
    const { data: updatedBiz, error: updErr } = await sb
      .from('businesses')
      .update(updates)
      .eq('id', currentBusinessId)
      .select();
    
    if (updErr) { 
      alert('Save failed: ' + updErr.message); 
      console.error('[owner-form] Business update error:', updErr); 
      console.error('[owner-form] Error details:', {
        message: updErr.message,
        code: updErr.code,
        details: updErr.details,
        hint: updErr.hint
      });
      return; 
    }
    
    console.log('[owner-form] Business updated successfully!');
    console.log('[owner-form] Updated business data:', updatedBiz);
    
    // Show what was saved
    if (updatedBiz && updatedBiz[0]) {
      alert('Saved! Logo URL in database: ' + (updatedBiz[0].logo_url || 'none'));
    }

    // Save gallery changes
    console.log('[owner-form] Saving gallery changes...');
    await saveGalleryChanges();
    console.log('[owner-form] Gallery changes saved');

    alert('All saved! Redirecting to owner.html...');
    location.href = '/owner.html';
  }

document.addEventListener('DOMContentLoaded', preloadEdit);