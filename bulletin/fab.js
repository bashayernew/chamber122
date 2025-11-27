// /bulletin/fab.js
console.log('[bulletin/fab.js] Starting to load...');
import { uploadBusinessImage } from '../js/lib/uploads.js';

// Safe helpers
const qs = (sel) => document.querySelector(sel);
const val = (sel) => (qs(sel)?.value ?? '').trim();

if (window.DEBUG) console.log('[bulletin] Initializing FAB...');

// Get Supabase client
async function getSupabase() {
  // Try immediate access
  let client = window.__supabase || window.__supabaseClient || window.supabase;
  if (client) {
    return client;
  }
  
  // Wait for client to be ready (max 3 seconds)
  const maxWait = 3000;
  const start = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = setInterval(() => {
      client = window.__supabase || window.__supabaseClient || window.supabase;
      if (client) {
        clearInterval(check);
        resolve(client);
      } else if (Date.now() - start > maxWait) {
        clearInterval(check);
        reject(new Error('Supabase client not initialized. Make sure supabase-client.global.js is loaded first.'));
      }
    }, 50);
  });
}

// Initialize FAB on page load
async function initializeFAB() {
  try {
    if (window.DEBUG) console.log('[bulletin] FAB initializing...');
    setupEventListeners();
    loadBulletins();
  } catch (error) {
    console.error('[bulletin] Error initializing FAB:', error);
  }
}

// Load bulletins from database
async function loadBulletins() {
  try {
    const supabase = await getSupabase();
    console.log('[bulletin] Loading bulletins from bulletins table...');
    
    const { data, error } = await supabase
      .from('bulletins')
      .select('id,title,body,business_id,cover_url,created_at,contact_phone,contact_email,governorate,area,street,block,floor,businesses(id,name,logo_url)')
      .eq('status', 'published')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[bulletin] Error loading bulletins:', error);
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('ERR_NAME_NOT_RESOLVED') || errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
        const grid = qs('#bulletin-grid');
        if (grid) {
          grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #e11d48;"><i class="fas fa-wifi" style="font-size: 48px; margin-bottom: 16px;"></i><h3 style="color: #e11d48; margin: 0 0 8px 0;">Connection Error</h3><p style="margin: 0; font-size: 14px;">Unable to connect to the server. Please check your internet connection and try again.</p></div>';
        }
      }
      displayBulletins([]);
      return;
    }

    console.log('[bulletin] Loaded', data?.length || 0, 'bulletins');
    
    // Transform data to match display format and filter out incomplete bulletins
    // Allow test items for development
    const transformedData = (data || [])
      .filter(b => {
        // Check for valid title and body
        if (!b.title || !b.body) return false;
        const title = b.title.trim();
        const body = b.body.trim();
        if (!title || !body) return false;
        
        // Allow test items - only filter out obvious fake/dummy content
        // Commented out test filtering to allow test bulletins to be visible
        // const titleLower = title.toLowerCase();
        // if (titleLower.includes('fake') || 
        //     titleLower.includes('dummy')) {
        //   return false;
        // }
        
        // Require minimum length for meaningful content
        if (title.length < 3 || body.length < 10) return false;
        
        // Must have a valid business_id
        if (!b.business_id) return false;
        
        return true;
      })
      .map(b => ({
        id: b.id,
        title: b.title,
        description: b.body,
        business_name: b.businesses?.name || 'Business',
        business_logo_url: b.businesses?.logo_url,
        cover_image_url: b.cover_url,
        location: [b.governorate, b.area, b.street, b.block, b.floor].filter(Boolean).join(', '),
        created_at: b.created_at,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email
      }));
    
    console.log('[bulletin] Filtered to', transformedData.length, 'valid bulletins');
    displayBulletins(transformedData);
  } catch (err) {
    console.error('[bulletin] Error loading bulletins:', err);
    displayBulletins([]);
  }
}

// Display bulletins in the grid
function displayBulletins(bulletins) {
  const grid = qs('#bulletin-grid');
  if (!grid) {
    if (window.DEBUG) console.warn('[bulletin] Bulletin grid not found');
    return;
  }

  if (!bulletins || bulletins.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No bulletins found.</p>';
    return;
  }

  // Format date range helper
  const formatDateRange = (start, end) => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    if (s && e) return `${s.toLocaleString([], opts)} – ${e.toLocaleString([], opts)}`;
    if (s) return s.toLocaleString([], opts);
    return '—';
  };

  grid.innerHTML = bulletins.map(bulletin => {
    const coverImage = bulletin.cover_image_url || bulletin.cover_url || '';
    const startDate = bulletin.start_at || bulletin.start_date || bulletin.publish_at || bulletin.created_at || null;
    const endDate = bulletin.end_at || bulletin.deadline_date || bulletin.end_date || bulletin.expire_at || null;
    const description = (bulletin.description || bulletin.content || bulletin.body || '').substring(0, 100);
    const location = bulletin.location || '';
    const bulletinId = bulletin.id || bulletin.item_id || '';
    
    return `
      <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; cursor: pointer; height: 100%; position: relative;"
           onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
        <a href="/bulletin.html?id=${encodeURIComponent(bulletinId)}" style="text-decoration: none; color: inherit; display: block;">
          ${coverImage ? `
            <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
              <img src="${coverImage}" alt="${bulletin.title || 'Bulletin'}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          ` : `
            <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-bullhorn" style="color: #111; font-size: 48px;"></i>
            </div>
          `}
          <div style="padding: 16px;">
            <h3 style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">${bulletin.title ?? 'Announcement'}</h3>
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
                ${description}${(bulletin.description || bulletin.content || bulletin.body || '').length > 100 ? '...' : ''}
              </p>
            ` : ''}
          </div>
        </a>
      </div>
    `;
  }).join('');
}

// Setup event listeners
function setupEventListeners() {
  // FAB button
  const fabBtn = qs('#fabAddBulletin');
  if (fabBtn) {
    fabBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Check authentication using new API
      try {
        const { requireAuthOrPrompt } = await import('/public/js/auth-guard.js');
        await requireAuthOrPrompt();
        // If we get here, user is authenticated
        openBulletinModal();
      } catch (err) {
        if (err.message === 'AUTH_REQUIRED') {
          console.log('User needs to log in to post bulletin');
          // Modal or redirect handled by requireAuthOrPrompt
        } else {
          console.error('Auth check error:', err);
        }
      }
    });
  }

  // Bulletin form submission
  const form = qs('#bulletinForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSubmit();
    });
  }

  // Publish button - use direct approach
  const publishBtn = qs('#bPublish');
  if (publishBtn) {
    console.log('[bulletin] Publish button found, attaching click handler');
    publishBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[bulletin] Publish button clicked!');
      await handleSubmit();
    });
  } else {
    console.error('[bulletin] Publish button NOT found!');
  }

  // Close modal buttons
  const closeBtn = qs('#bClose');
  const cancelBtn = qs('#bCancel');
  
  if (closeBtn) closeBtn.addEventListener('click', closeBulletinModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBulletinModal);

  // Close on backdrop click
  const modal = qs('#bulletinModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBulletinModal();
    });
  }
}

// Handle bulletin form submission
async function handleSubmit() {
  try {
    console.log('[bulletin] Submit clicked');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be signed in.');
      return;
    }
    
    // Check if account is suspended
    const { isAccountSuspended } = await import('/js/api.js');
    if (await isAccountSuspended()) {
      alert('Your account has been suspended. You cannot post bulletins. Please contact support if you have any questions or would like to appeal this decision.');
      return;
    }

    const title = qs('#bTitle')?.value?.trim();
    const description = qs('#bDesc')?.value?.trim();
    const contact_phone = qs('#bPhone')?.value?.trim();
    const contact_email = qs('#bEmail')?.value?.trim();
    const governorate = qs('#bGovernorate')?.value?.trim();
    const area = qs('#bArea')?.value?.trim();
    const street = qs('#bStreet')?.value?.trim();
    const block = qs('#bBlock')?.value?.trim();
    const floor = qs('#bFloor')?.value?.trim();
    const deadline = qs('#bDeadline')?.value || null;
    const file = qs('#bFile')?.files?.[0];

    console.log('[bulletin] Form data:', { title, description });

    if (!title || !description) {
      alert('Title and description are required.');
      return;
    }

    if (!contact_phone && !contact_email) {
      alert("Please add a phone number or an email.");
      return;
    }

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!biz) throw new Error('No business found for this user.');
    const businessId = biz.id;

    let cover_url = null;
    if (file) {
      const up = await uploadBusinessImage({
        supabase,
        businessId,   // ✅ business id
        file,
        kind: 'bulletin',
      });
      cover_url = up.publicUrl;
    }

    const supabase = await getSupabase();
    const { error } = await supabase.from('bulletins').insert({
      business_id: biz.id,
      title, body: description,
      contact_phone, contact_email,
      governorate, area, street, block, floor,
      end_at: deadline ?? null,
      cover_url,
      status: 'published',
      is_published: true
    });

    if (error) {
      console.error('[bulletin] Insert error:', error);
      throw error;
    }
    alert('✅ Bulletin created successfully!');
    
    // Reset form and close modal
    const form = qs('#bulletinForm');
    if (form) form.reset();
    closeBulletinModal();
    
    // Reload bulletins
    await loadBulletins();
    
    // Refresh all displays
    if (window.refreshEventsAndBulletins) {
      window.refreshEventsAndBulletins();
    }
    
  } catch (err) {
    console.error('[bulletin] create failed:', err);
    alert(`Bulletin creation failed: ${err.message}`);
  }
}

// Open bulletin modal
function openBulletinModal() {
  const modal = qs('#bulletinModal');
  const fabBtn = qs('#fabAddBulletin');
  
  console.log('[bulletin] Opening modal, fabBtn:', fabBtn);
  
  if (modal) {
    modal.hidden = false;
    modal.style.display = 'flex';
    console.log('[bulletin] Modal opened');
  } else {
    console.error('[bulletin] Modal not found!');
  }
  
  // Hide the FAB button when modal is open
  if (fabBtn) {
    console.log('[bulletin] Hiding FAB button');
    fabBtn.style.display = 'none';
    fabBtn.style.visibility = 'hidden';
  } else {
    console.error('[bulletin] FAB button not found!');
  }
}

// Close bulletin modal
function closeBulletinModal() {
  const modal = qs('#bulletinModal');
  const fabBtn = qs('#fabAddBulletin');
  
  console.log('[bulletin] Closing modal, fabBtn:', fabBtn);
  
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
    console.log('[bulletin] Modal closed');
  }
  
  // Show the FAB button when modal is closed
  if (fabBtn) {
    console.log('[bulletin] Showing FAB button');
    fabBtn.style.display = 'inline-flex';
    fabBtn.style.visibility = 'visible';
  } else {
    console.error('[bulletin] FAB button not found!');
  }
}

// Make functions available globally
window.openBulletinModal = openBulletinModal;
window.closeBulletinModal = closeBulletinModal;
window.loadBulletins = loadBulletins;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFAB);
} else {
  initializeFAB();
}

// Also attach a global click handler for the Publish button as a fallback
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'bPublish') {
    console.log('[bulletin] Publish button clicked via event delegation');
    e.preventDefault();
    e.stopPropagation();
    await handleSubmit();
  }
});
    fabBtn.style.display = 'none';
    fabBtn.style.visibility = 'hidden';
  } else {
    console.error('[bulletin] FAB button not found!');
  }
}

// Close bulletin modal
function closeBulletinModal() {
  const modal = qs('#bulletinModal');
  const fabBtn = qs('#fabAddBulletin');
  
  console.log('[bulletin] Closing modal, fabBtn:', fabBtn);
  
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
    console.log('[bulletin] Modal closed');
  }
  
  // Show the FAB button when modal is closed
  if (fabBtn) {
    console.log('[bulletin] Showing FAB button');
    fabBtn.style.display = 'inline-flex';
    fabBtn.style.visibility = 'visible';
  } else {
    console.error('[bulletin] FAB button not found!');
  }
}

// Make functions available globally
window.openBulletinModal = openBulletinModal;
window.closeBulletinModal = closeBulletinModal;
window.loadBulletins = loadBulletins;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFAB);
} else {
  initializeFAB();
}

// Also attach a global click handler for the Publish button as a fallback
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'bPublish') {
    console.log('[bulletin] Publish button clicked via event delegation');
    e.preventDefault();
    e.stopPropagation();
    await handleSubmit();
  }
});