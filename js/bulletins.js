// js/bulletins.js - Bulletin page logic (mirror events.js pattern)
import { getPublicBulletins, getBulletinById, createBulletin, getCurrentUser, registerForBulletin } from './api.js';

let bulletins = [];
let filteredBulletins = [];
let currentBulletinModal = null;

// Make showBulletinDetails globally accessible IMMEDIATELY (before any cards are rendered)
window.showBulletinDetails = async function(bulletinId) {
  try {
    console.log('[bulletins] showBulletinDetails called for:', bulletinId);
    const bulletin = await getBulletinById(bulletinId);
    if (!bulletin) {
      alert('Bulletin not found');
      return;
    }

    // Remove existing modal if any
    if (currentBulletinModal) {
      currentBulletinModal.remove();
      currentBulletinModal = null;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const createdDate = new Date(bulletin.created_at).toLocaleDateString();
    const startDate = bulletin.start_at || bulletin.start_date || bulletin.publish_at || bulletin.created_at;
    const endDate = bulletin.end_at || bulletin.deadline_date || bulletin.end_date || bulletin.expire_at;
    const businessName = bulletin.business_name || bulletin.business_display_name || 'Unknown Business';
    const businessLogo = bulletin.business_logo_url || '';
    const businessId = bulletin.business_id;
    const coverImage = bulletin.image_url || bulletin.cover_image_url || bulletin.cover_url || '';

    modal.innerHTML = `
      <div class="modal-content" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;width:90%;max-width:600px;max-height:90vh;position:relative;display:flex;flex-direction:column;overflow:hidden;">
        <div class="modal-header" style="padding:20px;border-bottom:1px solid #2a2a2a;position:relative;flex-shrink:0;">
          <button class="modal-close" style="position:absolute;top:15px;right:20px;background:none;border:none;color:#a0a0a0;font-size:1.5rem;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;z-index:10;">&times;</button>
          <h2 style="margin:0;color:#e0e0e0;padding-right:40px;">${escapeHtml(bulletin.title)}</h2>
          <p style="margin:5px 0 0 0;color:#a0a0a0;font-size:0.9rem;">${createdDate}</p>
        </div>
        <div class="modal-body" style="padding:20px;flex:1;overflow-y:auto;min-height:0;">
          ${coverImage ? `
            <div style="width:100%;height:200px;overflow:hidden;background:#2a2a2a;border-radius:8px;margin-bottom:20px;">
              <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(bulletin.title)}" style="width:100%;height:100%;object-fit:cover;">
            </div>
          ` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;cursor:pointer;" data-business-id="${businessId || ''}">
            ${businessLogo ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">` : ''}
            <span style="color:#a0a0a0;font-weight:500;">${escapeHtml(businessName)}</span>
          </div>
          ${bulletin.category ? `<div style="margin-bottom:10px;"><span style="padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:500;color:white;background:#374151;">${escapeHtml(bulletin.category)}</span></div>` : ''}
          ${(startDate || endDate) ? `
            <div style="color:#f2c64b;font-size:14px;margin-bottom:15px;">
              ${startDate ? `<div><strong>Start:</strong> ${new Date(startDate).toLocaleString()}</div>` : ''}
              ${endDate ? `<div><strong>End:</strong> ${new Date(endDate).toLocaleString()}</div>` : ''}
            </div>
          ` : ''}
          <div style="color:#c0c0c0;line-height:1.6;white-space:pre-wrap;margin-bottom:20px;">${escapeHtml(bulletin.body || bulletin.content || '')}</div>
          ${bulletin.url ? `<div style="margin-bottom:20px;"><a href="${escapeHtml(bulletin.url)}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:none;">View Link →</a></div>` : ''}
        </div>
        <!-- Registration Form - Fixed at bottom -->
        <div style="border-top:1px solid #2a2a2a;padding:20px;flex-shrink:0;background:#1a1a1a;">
          <h3 style="color:#e0e0e0;margin-bottom:15px;font-size:1.1rem;">Register Your Interest</h3>
          <form id="bulletin-register-form-${bulletin.id}" style="display:flex;flex-direction:column;gap:12px;">
            <input type="text" name="name" placeholder="Your Name" required style="padding:10px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#e0e0e0;font-size:0.9rem;">
            <input type="email" name="email" placeholder="Your Email" required style="padding:10px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#e0e0e0;font-size:0.9rem;">
            <input type="tel" name="phone" placeholder="Phone (Optional)" style="padding:10px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#e0e0e0;font-size:0.9rem;">
            <button type="submit" style="padding:12px;background:var(--gold,#fbbf24);color:#111;border:none;border-radius:8px;font-weight:600;cursor:pointer;transition:opacity 0.2s;">Register</button>
          </form>
          <div id="bulletin-register-message-${bulletin.id}" style="margin-top:10px;display:none;"></div>
        </div>
      </div>
    `;

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => {
      modal.remove();
      currentBulletinModal = null;
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        currentBulletinModal = null;
      }
    });

    // Business click handler
    const businessEl = modal.querySelector('[data-business-id]');
    if (businessEl && businessId) {
      businessEl.addEventListener('click', () => {
        window.location.href = `/owner.html?businessId=${businessId}`;
      });
      businessEl.style.cursor = 'pointer';
    }

    // Registration form handler
    const registerForm = modal.querySelector(`#bulletin-register-form-${bulletin.id}`);
    const registerMessage = modal.querySelector(`#bulletin-register-message-${bulletin.id}`);
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const registrationData = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone') || null
        };

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        try {
          await registerForBulletin(bulletin.id, registrationData);
          registerMessage.style.display = 'block';
          registerMessage.style.color = '#4ade80';
          registerMessage.textContent = '✓ Registration successful!';
          registerForm.reset();
          setTimeout(() => {
            registerMessage.style.display = 'none';
          }, 3000);
        } catch (error) {
          registerMessage.style.display = 'block';
          registerMessage.style.color = '#ef4444';
          registerMessage.textContent = 'Registration failed. Please try again.';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }

    document.body.appendChild(modal);
    currentBulletinModal = modal;
    
    // Force modal to be visible
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    
    console.log('[bulletins] Modal displayed for bulletin:', bulletinId);
    console.log('[bulletins] Modal element:', modal);
    console.log('[bulletins] Modal computed style:', window.getComputedStyle(modal).display);
    
    // Verify modal content is visible
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      console.log('[bulletins] Modal content found, registration form:', modal.querySelector('form') ? 'Found' : 'NOT FOUND');
    }
  } catch (error) {
    console.error('[bulletins] Error loading details:', error);
    alert('Failed to load bulletin details: ' + (error.message || 'Unknown error'));
  }
};

// Helper function for escaping HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open bulletin form modal
function openBulletinForm() {
  const modal = document.getElementById('bulletinModal');
  if (!modal) {
    console.error('[bulletins] Bulletin modal not found');
    return;
  }
  console.log('[bulletins] Opening bulletin form modal');
  modal.removeAttribute('hidden');
  modal.style.display = 'flex'; // Ensure modal is visible
  modal.style.visibility = 'visible';
  // Don't reset if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('edit')) {
    document.getElementById('bulletinForm')?.reset();
  }
  const titleInput = document.getElementById('bTitle');
  if (titleInput) {
    titleInput.focus();
  }
}

// Close bulletin form modal
function closeBulletinForm() {
  const modal = document.getElementById('bulletinModal');
  if (modal) {
    modal.setAttribute('hidden', '');
    modal.style.display = 'none';
  }
  if (currentBulletinModal) {
    currentBulletinModal.remove();
    currentBulletinModal = null;
  }
  
  // Clear form and preview (but preserve edit ID if in edit mode)
  const form = document.getElementById('bulletinForm');
  const urlParams = new URLSearchParams(window.location.search);
  if (form && !urlParams.get('edit')) {
    form.reset();
    form.removeAttribute('data-edit-id');
  }
  
  const imagePreview = document.getElementById('bImagePreview');
  const imagePreviewContainer = document.getElementById('bImagePreviewContainer');
  if (imagePreview && imagePreviewContainer) {
    imagePreviewContainer.style.display = 'none';
    if (imagePreview.dataset.objectUrl) {
      URL.revokeObjectURL(imagePreview.dataset.objectUrl);
    }
  }
}

// Setup modal handlers
function setupModalHandlers() {
  const modal = document.getElementById('bulletinModal');
  if (!modal) return;

  const closeBtn = document.getElementById('bClose');
  const cancelBtn = document.getElementById('bCancel');
  const publishBtn = document.getElementById('bPublish');
  const form = document.getElementById('bulletinForm');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeBulletinForm);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBulletinForm);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeBulletinForm();
      }
    });
  }
  if (form) {
    form.addEventListener('submit', handleBulletinSubmit);
  }
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      form?.requestSubmit();
    });
  }

  // Character counter for description
  const descEl = document.getElementById('bDesc');
  const descCountEl = document.getElementById('descCount');
  if (descEl && descCountEl) {
    descEl.addEventListener('input', () => {
      descCountEl.textContent = descEl.value.length;
    });
  }

  // Image preview handler
  const fileInput = document.getElementById('bFile');
  const imagePreview = document.getElementById('bImagePreview');
  const imagePreviewContainer = document.getElementById('bImagePreviewContainer');
  const removeImageBtn = document.getElementById('bRemoveImage');
  
  if (fileInput && imagePreview && imagePreviewContainer) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        imagePreview.src = objectUrl;
        imagePreviewContainer.style.display = 'block';
        imagePreview.dataset.objectUrl = objectUrl;
      } else {
        imagePreviewContainer.style.display = 'none';
        if (imagePreview.dataset.objectUrl) {
          URL.revokeObjectURL(imagePreview.dataset.objectUrl);
        }
      }
    });
    
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => {
        fileInput.value = '';
        imagePreviewContainer.style.display = 'none';
        if (imagePreview.dataset.objectUrl) {
          URL.revokeObjectURL(imagePreview.dataset.objectUrl);
        }
      });
    }
  }
}

// Setup FAB button
function setupFAB() {
  const fabBtn = document.getElementById('fabAddBulletin');
  if (fabBtn) {
    fabBtn.addEventListener('click', async () => {
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = '/auth.html#login';
        return;
      }
      openBulletinForm();
    });
  }
}

// Handle bulletin form submission
async function handleBulletinSubmit(e) {
  e.preventDefault();
  
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/auth.html#login';
    return;
  }
  
  // Check if account is suspended
  const { isAccountSuspended } = await import('./api.js');
  if (await isAccountSuspended()) {
    alert('Your account has been suspended. You cannot post bulletins. Please contact support if you have any questions or would like to appeal this decision.');
    return;
  }

  const form = e.target;
  const publishBtn = document.getElementById('bPublish');
  const editId = form.dataset.editId || new URLSearchParams(window.location.search).get('edit');
  const isEditMode = !!editId;
  
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.textContent = isEditMode ? 'Updating...' : 'Publishing...';
  }

  try {
    // Upload image first if provided
    let imageUrl = null;
    const fileInput = document.getElementById('bFile');
    if (fileInput?.files?.[0]) {
      try {
        const { uploadFile } = await import('./api.js');
        const uploadResult = await uploadFile(fileInput.files[0], 'bulletin_image');
        imageUrl = uploadResult.publicUrl || uploadResult.public_url;
      } catch (uploadError) {
        console.error('[bulletins] Image upload error:', uploadError);
        alert('Failed to upload image. Continuing without image...');
      }
    }
    
    const formData = new FormData(form);
    const bulletinData = {
      title: formData.get('title') || document.getElementById('bTitle')?.value || '',
      body: formData.get('description') || document.getElementById('bDesc')?.value || '',
      content: formData.get('description') || document.getElementById('bDesc')?.value || '',
      category: formData.get('type') || document.getElementById('bType')?.value || null,
      location: formData.get('location') || document.getElementById('bLoc')?.value || null,
      deadline: formData.get('deadline') || document.getElementById('bDeadline')?.value || null,
      contact_phone: formData.get('contact_phone') || document.getElementById('bPhone')?.value || null,
      contact_email: formData.get('contact_email') || document.getElementById('bEmail')?.value || null,
      governorate: formData.get('governorate') || document.getElementById('bGovernorate')?.value || null,
      area: formData.get('area') || document.getElementById('bArea')?.value || null,
      street: formData.get('street') || document.getElementById('bStreet')?.value || null,
      block: formData.get('block') || document.getElementById('bBlock')?.value || null,
      floor: formData.get('floor') || document.getElementById('bFloor')?.value || null,
      image_url: imageUrl,
      is_published: true,
      status: 'published'
    };

    if (bulletinData.deadline) {
      bulletinData.end_at = new Date(bulletinData.deadline).toISOString();
    }

    const editId = form.dataset.editId || new URLSearchParams(window.location.search).get('edit');
    const isEditMode = !!editId;
    
    let bulletin;
    if (isEditMode) {
      // Update existing bulletin
      const token = localStorage.getItem('session_token');
      const response = await fetch(`/api/bulletins/${editId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(bulletinData)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update bulletin' }));
        throw new Error(error.error || 'Failed to update bulletin');
      }
      
      const result = await response.json();
      bulletin = result.bulletin || result;
      alert('Bulletin updated successfully!');
    } else {
      // Create new bulletin
      bulletin = await createBulletin(bulletinData);
      alert('Bulletin published successfully!');
    }
    
    closeBulletinForm();
    // Clear edit parameter from URL
    if (isEditMode) {
      window.history.replaceState({}, '', '/bulletin.html');
      form.removeAttribute('data-edit-id');
    }
    await loadBulletins(); // Reload feed
  } catch (error) {
    console.error('[bulletins] Submit error:', error);
    // Handle 401 Unauthorized
    if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      alert('Please log in to publish bulletins.');
      window.location.href = '/auth.html#login';
      return;
    }
    alert(error.message || 'Failed to publish bulletin');
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish';
    }
  }
}

// Setup bulletin details modal
function setupBulletinDetails() {
  // Click handlers will be added in renderBulletins
}

// Function is now defined at the top of the file - removed duplicate

// Filter bulletins based on search and date range
function filterBulletins() {
  const searchInput = document.getElementById('q');
  const dateRangeSelect = document.getElementById('range');
  
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const dateRange = dateRangeSelect?.value || 'all';
  
  filteredBulletins = bulletins.filter(bulletin => {
    // Search filter
    const title = (bulletin.title || '').toString().toLowerCase();
    const description = (bulletin.body || bulletin.content || bulletin.description || '').toString().toLowerCase();
    const businessName = (bulletin.business_name || bulletin.business_display_name || '').toString().toLowerCase();
    
    const matchesSearch = !searchTerm || 
      title.includes(searchTerm) || 
      description.includes(searchTerm) || 
      businessName.includes(searchTerm);
    
    // Date range filter
    const matchesDateRange = filterByDateRange(bulletin, dateRange);
    
    return matchesSearch && matchesDateRange;
  });
  
  renderBulletins();
}

// Filter by date range
function filterByDateRange(bulletin, range) {
  if (range === 'all') return true;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const startDate = bulletin.start_at || bulletin.start_date || bulletin.publish_at || bulletin.created_at;
  const endDate = bulletin.end_at || bulletin.deadline_date || bulletin.end_date || bulletin.expire_at;
  
  if (!startDate && !endDate) {
    return range === 'all';
  }
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  switch (range) {
    case 'today':
      const todayStart = new Date(now);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      if (start && end) {
        return (start <= todayEnd && end >= todayStart);
      } else if (start) {
        return (start >= todayStart && start <= todayEnd);
      } else if (end) {
        return (end >= todayStart && end <= todayEnd);
      }
      return false;
      
    case 'upcoming':
      if (start) {
        return start >= now;
      } else if (end) {
        return end >= now;
      }
      return false;
      
    case 'past':
      if (end) {
        return end < now;
      } else if (start) {
        return start < now;
      }
      return false;
      
    default:
      return true;
  }
}

// Render bulletins with modern dark grid cards
function renderBulletins() {
  const container = document.getElementById('bulletin-grid');
  if (!container) {
    console.warn('[bulletins] Bulletin grid container not found');
    return;
  }

  const bulletinsToRender = filteredBulletins.length > 0 ? filteredBulletins : bulletins;

  if (bulletinsToRender.length === 0) {
    container.innerHTML = '<div class="no-bulletins" style="text-align:center;padding:40px;color:#a0a0a0;">No bulletins found.</div>';
    return;
  }

  // Modern dark grid layout
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  container.style.gap = '20px';
  container.style.marginTop = '30px';

  container.innerHTML = bulletinsToRender.map(bulletin => {
    const createdDate = new Date(bulletin.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const businessName = bulletin.business_name || bulletin.business_display_name || 'Unknown Business';
    const businessLogo = bulletin.business_logo_url || '';
    const businessId = bulletin.business_id;
    const fullText = bulletin.body || bulletin.content || '';
    const snippet = fullText.length > 150 ? fullText.substring(0, 150) + '...' : fullText;
    const category = bulletin.category ? `<span class="bulletin-type" style="padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:500;color:white;background:#374151;display:inline-block;">${escapeHtml(bulletin.category)}</span>` : '';
    
    // Get image URL (support multiple field names)
    const coverImage = bulletin.image_url || bulletin.cover_image_url || bulletin.cover_url || '';
    
    // Check if bulletin is active (can register)
    const now = new Date();
    const startDate = bulletin.start_at || bulletin.start_date || bulletin.publish_at || bulletin.created_at || null;
    const endDate = bulletin.end_at || bulletin.deadline_date || bulletin.end_date || bulletin.expire_at || null;
    const isActive = (!startDate || new Date(startDate) <= now) && (!endDate || new Date(endDate) >= now);

    return `
      <div class="bulletin-card" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;transition:all 0.2s ease;height:100%;position:relative;cursor:pointer;" data-bulletin-id="${bulletin.id}">
        <!-- Business Profile Header (TOP) -->
        ${businessName ? `
          <div onclick="event.stopPropagation(); window.location.href='/owner.html?businessId=${businessId || ''}'" style="padding: 12px 16px; background: #0f0f0f; border-bottom: 1px solid #2a2a2a; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#151515'" onmouseout="this.style.background='#0f0f0f'">
            ${businessLogo ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; border: 1px solid #2a2a2a;">` : `<div style="width: 32px; height: 32px; border-radius: 6px; background: #374151; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px; font-weight: 600;">${(businessName || 'B').charAt(0).toUpperCase()}</div>`}
            <div style="flex: 1;">
              <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Posted by</div>
              <div style="color: #fff; font-size: 14px; font-weight: 600;">${escapeHtml(businessName)}</div>
          </div>
            <i class="fas fa-chevron-right" style="color: #6b7280; font-size: 12px;"></i>
          </div>
        ` : ''}
        
        <!-- Bulletin Image -->
        <div class="bulletin-image-clickable" data-bulletin-id="${bulletin.id}" style="cursor: pointer;">
          ${coverImage ? `
            <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
              <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(bulletin.title || 'Bulletin')}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          ` : `
            <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-bullhorn" style="color: #111; font-size: 48px;"></i>
          </div>
          `}
        </div>

        <!-- Bulletin Content -->
        <div style="padding: 16px;">
          <h3 class="bulletin-title-clickable" data-bulletin-id="${bulletin.id}" style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; line-height: 1.3; cursor: pointer;">${escapeHtml(bulletin.title)}</h3>
          
          ${startDate || endDate ? `
            <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px;">
              ${(() => {
                const s = startDate ? new Date(startDate) : null;
                const e = endDate ? new Date(endDate) : null;
                if (s && e) {
                  const startStr = `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
                  const endStr = `${e.getDate()} ${e.toLocaleString('en-US', { month: 'short' })}, ${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`;
                  return `${startStr} – ${endStr}`;
                }
                if (s) {
                  return `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })}, ${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
                }
                return '—';
              })()}
        </div>
          ` : ''}
          
          ${location ? `
            <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 16px;">
              ${escapeHtml(location)}
        </div>
          ` : ''}
          
          <!-- Action Buttons - Always show both -->
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="bulletin-more-info-btn" data-bulletin-id="${bulletin.id}" style="flex: 1; padding: 10px 16px; background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#333'; this.style.borderColor='#444'" onmouseout="this.style.background='#2a2a2a'; this.style.borderColor='#3a3a3a'">
              More Info
            </button>
            <button class="bulletin-register-btn" data-bulletin-id="${bulletin.id}" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #ffd166, #ffed4e); color: #111; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              Register
            </button>
          </div>
        </div>
    </div>
  `;
  }).join('');

  // Add click handlers for bulletin cards
  container.querySelectorAll('.bulletin-card').forEach(card => {
    card.addEventListener('click', (e) => {
      console.log('[bulletins] Card clicked, target:', e.target, 'closest button:', e.target.closest('button'));
      // Don't trigger if clicking on button or company link
      if (e.target.closest('button') || e.target.closest('[onclick*="owner.html"]')) {
        console.log('[bulletins] Click ignored - button or link clicked');
        return;
      }
      const bulletinId = card.getAttribute('data-bulletin-id');
      console.log('[bulletins] Card clicked, bulletinId:', bulletinId, 'showBulletinDetails type:', typeof window.showBulletinDetails);
      if (bulletinId && typeof window.showBulletinDetails === 'function') {
        console.log('[bulletins] Calling showBulletinDetails for:', bulletinId);
        e.preventDefault();
        e.stopPropagation();
        window.showBulletinDetails(bulletinId);
      } else {
        console.error('[bulletins] Cannot open modal - bulletinId:', bulletinId, 'showBulletinDetails:', typeof window.showBulletinDetails);
        alert('Cannot open bulletin details. Function not available.');
      }
    });
  });

  // Add click handlers for image, title, and buttons
  container.querySelectorAll('.bulletin-image-clickable, .bulletin-title-clickable, .bulletin-more-info-btn, .bulletin-register-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const bulletinId = el.getAttribute('data-bulletin-id');
      if (bulletinId && typeof window.showBulletinDetails === 'function') {
        console.log('[bulletins] Element clicked, opening modal for:', bulletinId);
        window.showBulletinDetails(bulletinId);
      } else {
        console.error('[bulletins] Cannot open modal - bulletinId:', bulletinId, 'showBulletinDetails:', typeof window.showBulletinDetails);
      }
    });
  });
}

// Load bulletins from API
async function loadBulletins() {
  try {
    const result = await getPublicBulletins();
    bulletins = Array.isArray(result) ? result : (result?.bulletins || []);
    
    // Store in localStorage for fallback
    if (bulletins.length > 0) {
      try {
        localStorage.setItem('chamber122_bulletins', JSON.stringify(bulletins));
      } catch (e) {
        console.warn('[bulletins] Could not store in localStorage:', e);
      }
    }
    
    filteredBulletins = [];
    filterBulletins(); // Apply filters and render
  } catch (error) {
    console.error('[bulletins] Error loading bulletins:', error);
    
    // Use localStorage directly (no API)
    try {
      const { getPublicBulletins } = await import('./api.js');
      bulletins = await getPublicBulletins();
      console.log(`[bulletins] Loaded ${bulletins.length} bulletins from localStorage`);
      filteredBulletins = [];
      filterBulletins(); // Apply filters and render
      return;
    } catch (e) {
      console.warn('[bulletins] Error reading from localStorage:', e);
    }
    
    const container = document.getElementById('bulletin-grid');
    if (container) {
      container.innerHTML = '<div class="no-bulletins" style="text-align:center;padding:40px;color:#a0a0a0;">No bulletins available. Be the first to post one!</div>';
    }
  }
}

// Check for edit parameter and load bulletin for editing
async function checkEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  
  if (editId) {
    console.log('[bulletins] Edit mode detected for bulletin:', editId);
    try {
      const bulletin = await getBulletinById(editId);
      if (!bulletin) {
        alert('Bulletin not found');
        window.location.href = '/bulletin.html';
        return;
      }
      
      // Check if user owns this bulletin
      const user = await getCurrentUser();
      if (!user || bulletin.owner_id !== user.id) {
        alert('You can only edit your own bulletins');
        window.location.href = '/bulletin.html';
    return; 
  }

      // Open the form modal and populate it
      openBulletinForm();
      populateEditForm(bulletin);
    } catch (error) {
      console.error('[bulletins] Error loading bulletin for edit:', error);
      alert('Failed to load bulletin for editing');
      window.location.href = '/bulletin.html';
    }
  }
}

// Populate form with bulletin data for editing
function populateEditForm(bulletin) {
  console.log('[bulletins] Populating form with bulletin data:', bulletin);
  
  // Get form elements (using correct IDs from bulletin.html)
  const titleInput = document.getElementById('bTitle');
  const descInput = document.getElementById('bDesc');
  const typeInput = document.getElementById('bType');
  const locInput = document.getElementById('bLoc');
  const deadlineInput = document.getElementById('bDeadline');
  const phoneInput = document.getElementById('bPhone');
  const emailInput = document.getElementById('bEmail');
  const governorateInput = document.getElementById('bGovernorate');
  const areaInput = document.getElementById('bArea');
  const streetInput = document.getElementById('bStreet');
  const blockInput = document.getElementById('bBlock');
  const floorInput = document.getElementById('bFloor');
  const imagePreview = document.getElementById('bImagePreview');
  const imagePreviewContainer = document.getElementById('bImagePreviewContainer');
  
  // Populate fields
  if (titleInput) titleInput.value = bulletin.title || '';
  if (descInput) descInput.value = bulletin.body || bulletin.content || bulletin.description || '';
  if (typeInput) typeInput.value = bulletin.category || bulletin.type || '';
  if (locInput) locInput.value = bulletin.location || '';
  if (phoneInput) phoneInput.value = bulletin.contact_phone || '';
  if (emailInput) emailInput.value = bulletin.contact_email || '';
  if (governorateInput) governorateInput.value = bulletin.governorate || '';
  if (areaInput) areaInput.value = bulletin.area || '';
  if (streetInput) streetInput.value = bulletin.street || '';
  if (blockInput) blockInput.value = bulletin.block || '';
  if (floorInput) floorInput.value = bulletin.floor || '';
  
  // Handle deadline date - convert ISO to date format (YYYY-MM-DD)
  if (deadlineInput) {
    const deadline = bulletin.deadline_date || bulletin.deadline || bulletin.end_at || bulletin.end_date;
    if (deadline) {
      const deadlineDate = new Date(deadline);
      deadlineInput.value = deadlineDate.toISOString().slice(0, 10); // YYYY-MM-DD format
    }
  }
  
  // Handle image preview
  const imageUrl = bulletin.image_url || bulletin.cover_image_url || bulletin.cover_url;
  if (imageUrl && imagePreview && imagePreviewContainer) {
    imagePreview.src = imageUrl;
    imagePreviewContainer.style.display = 'block';
  }
  
  // Store the bulletin ID for update
  const form = document.getElementById('bulletinForm');
  if (form) {
    form.dataset.editId = bulletin.id;
    // Update form title if there's a title element
    const modalTitle = document.querySelector('#bulletinModal h2, #bulletinModal .modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Bulletin';
    }
    // Update button text
    const publishBtn = document.getElementById('bPublish');
    if (publishBtn) {
      publishBtn.textContent = 'Update';
    }
  }
  
  console.log('[bulletins] Form populated for editing bulletin:', bulletin.id);
}

// Setup filter event listeners
function setupFilters() {
  const searchInput = document.getElementById('q');
  const dateRangeSelect = document.getElementById('range');
  
  if (searchInput) {
    searchInput.addEventListener('input', filterBulletins);
  }
  
  if (dateRangeSelect) {
    dateRangeSelect.addEventListener('change', filterBulletins);
  }
}

// Initialize page
async function init() {
  setupModalHandlers();
  setupFAB();
  setupBulletinDetails();
  setupFilters(); // Setup filter listeners
  await checkEditMode(); // Check for edit mode first
  await loadBulletins();
}

// Make openBulletinForm globally accessible
window.openBulletinForm = openBulletinForm;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
