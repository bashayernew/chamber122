// ---- Setup ----
import { supabase } from './supabase-client.global.js';

console.log('[owner-form] Loading version 8 - Using global client');

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
  
  wrap.classList.add('gallery-grid');
  wrap.innerHTML = '';

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
    if (removedMediaIds.has(m.id)) continue;

    console.log('Rendering existing image:', m.url);

    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = m.url;
    img.alt = 'image';
    img.onload = () => console.log('Image loaded successfully:', m.url);
    img.onerror = () => console.error('Image failed to load:', m.url);
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.onclick = () => {
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
    img.src = URL.createObjectURL(f);
    img.alt = f.name;
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.onclick = () => {
      console.log('Removing new file:', f.name);
      newFiles = newFiles.filter(x => x !== f);
      renderGallery();
    };
    item.appendChild(btn);

    wrap.appendChild(item);
  }
}

function wireGalleryInputs() {
  const galleryFilesInput = $('#galleryFiles');
  if (!galleryFilesInput) {
    console.error('Gallery files input not found!');
    return;
  }
  
  console.log('Wiring gallery inputs...');
  
  galleryFilesInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    console.log('Files selected:', files.length, files.map(f => f.name));
    
    newFiles = [...newFiles, ...files];
    console.log('Total new files now:', newFiles.length);
    
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

  const { data: biz } = await sb.from('businesses').select('*').eq('owner_id', user.id).single();
  if (!biz) {
    console.log('No business found for user');
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
  if (biz.logo_url) { 
    const lp = $('#logoPreview'); 
    if (lp) lp.src = biz.logo_url; 
  }

  // Load existing gallery
  await loadExistingGallery(currentBusinessId);

  // Wire up gallery inputs
  wireGalleryInputs();

  // Logo handler
  $('#logo')?.addEventListener('change', e => {
    const f = e.target.files?.[0]; 
    if (!f) return;
    $('#logoPreview').src = URL.createObjectURL(f);
  });

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

  console.log('Setting up event listeners...');
  const saveBtn = $('#saveBtn');
  const form = $('#biz-form');
  console.log('Save button found:', !!saveBtn);
  console.log('Form found:', !!form);
  
  saveBtn?.addEventListener('click', (e) => {
    console.log('Save button clicked');
    saveProfile(e);
  });
  form?.addEventListener('submit', (e) => {
    console.log('Form submitted');
    saveProfile(e);
  });
}

document.addEventListener('DOMContentLoaded', preloadEdit);