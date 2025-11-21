// Bulletin List Management
// Use global Supabase client
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

let bulletins = [];

// Initialize bulletin feed on page load
document.addEventListener('DOMContentLoaded', async () => {
  await reloadBulletinFeed();
});

// Export function for external calls (after publish/draft)
export async function reloadBulletinFeed() {
  try {
    console.log('Loading bulletin feed...');
    
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('activities_current')
      .select('*')
      .eq('type', 'bulletin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bulletins:', error);
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('ERR_NAME_NOT_RESOLVED') || errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
        showError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        showError('Failed to load bulletins. Please refresh the page.');
      }
      return;
    }

    // Filter bulletins (allow test items for development)
    bulletins = (data || []).filter(b => {
      // Check for valid title and description
      if (!b.title || !b.description) return false;
      const title = b.title.trim();
      const description = (b.description || b.content || '').trim();
      if (!title || !description) return false;
      
      // Allow test items - only filter out obvious fake/dummy content
      // Commented out test filtering to allow test bulletins to be visible
      // const titleLower = title.toLowerCase();
      // if (titleLower.includes('fake') || 
      //     titleLower.includes('dummy')) {
      //   return false;
      // }
      
      // Require minimum length for meaningful content
      if (title.length < 3 || description.length < 10) return false;
      
      // Must have a valid business_id
      if (!b.business_id) return false;
      
      return true;
    });
    
    renderBulletinList();
    console.log(`Loaded ${bulletins.length} bulletins`);
    
  } catch (error) {
    console.error('Error in reloadBulletinFeed:', error);
    showError('Failed to load bulletins. Please refresh the page.');
  }
}

// Render the bulletin list
function renderBulletinList() {
  const container = document.getElementById('bulletinList');
  if (!container) {
    console.warn('bulletinList container not found - this page may not need the bulletin list functionality');
    return;
  }

  if (bulletins.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-bullhorn" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <h3 style="color: #aaa; margin: 0 0 8px 0;">No bulletins yet</h3>
        <p style="margin: 0; font-size: 14px;">Be the first to share an opportunity with the community!</p>
      </div>
    `;
    return;
  }

  // Use grid layout like events page
  const gridHTML = bulletins.map(bulletin => createBulletinCard(bulletin)).join('');
  container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">${gridHTML}</div>`;
}

// Create individual bulletin card - matching event card design
function createBulletinCard(bulletin) {
  const coverImage = bulletin.cover_image_url || bulletin.cover_url || '';
  const startDate = bulletin.start_at || bulletin.start_date || bulletin.publish_at || bulletin.created_at || null;
  const endDate = bulletin.end_at || bulletin.deadline_date || bulletin.end_date || bulletin.expire_at || null;
  const description = (bulletin.description || bulletin.content || bulletin.body || '').substring(0, 100);
  const location = bulletin.location || '';
  const bulletinId = bulletin.id || bulletin.item_id || '';
  
  // Format date range helper
  const formatDateRange = (start, end) => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    if (s && e) return `${s.toLocaleString([], opts)} – ${e.toLocaleString([], opts)}`;
    if (s) return s.toLocaleString([], opts);
    return '—';
  };

  return `
    <div style="display: block; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; cursor: pointer; height: 100%; position: relative;"
         onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
      <a href="/bulletin.html?id=${encodeURIComponent(bulletinId)}" style="text-decoration: none; color: inherit; display: block;">
        ${coverImage ? `
          <div style="width: 100%; height: 180px; overflow: hidden; background: #2a2a2a;">
            <img src="${coverImage}" alt="${escapeHtml(bulletin.title || 'Bulletin')}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : `
          <div style="width: 100%; height: 180px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-bullhorn" style="color: #111; font-size: 48px;"></i>
          </div>
        `}
        <div style="padding: 16px;">
          <h3 style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">${escapeHtml(bulletin.title ?? 'Announcement')}</h3>
          ${(startDate || endDate) ? `
            <div style="color: #f2c64b; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-clock" style="font-size: 10px;"></i>
              <span>${formatDateRange(startDate, endDate)}</span>
            </div>
          ` : ''}
          ${location ? `
            <div style="color: #AFAFAF; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-map-marker-alt" style="font-size: 10px;"></i>
              <span>${escapeHtml(location)}</span>
            </div>
          ` : ''}
          ${description ? `
            <p style="color: #AFAFAF; font-size: 13px; line-height: 1.5; margin: 8px 0 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(description)}${(bulletin.description || bulletin.content || bulletin.body || '').length > 100 ? '...' : ''}
            </p>
          ` : ''}
        </div>
      </a>
    </div>
  `;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Download attachment (generates signed URL)
async function downloadAttachment(attachmentPath) {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.storage
      .from('bulletin-attachments')
      .createSignedUrl(attachmentPath, 3600); // 1 hour expiry

    if (error) throw error;

    // Open in new tab
    window.open(data.signedUrl, '_blank');
  } catch (error) {
    console.error('Error downloading attachment:', error);
    showError('Failed to download attachment. Please try again.');
  }
}

// Make downloadAttachment globally available
window.downloadAttachment = downloadAttachment;

// Show error message
function showError(message) {
  const container = document.getElementById('bulletinList');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #e11d48;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
        <h3 style="color: #e11d48; margin: 0 0 8px 0;">Error</h3>
        <p style="margin: 0; font-size: 14px;">${escapeHtml(message)}</p>
      </div>
    `;
  }
}

// Show loading state
function showLoading() {
  const container = document.getElementById('bulletinList');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div class="spinner" style="margin: 0 auto 16px;"></div>
        <p style="margin: 0; font-size: 14px;">Loading bulletins...</p>
      </div>
    `;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Download attachment (generates signed URL)
async function downloadAttachment(attachmentPath) {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.storage
      .from('bulletin-attachments')
      .createSignedUrl(attachmentPath, 3600); // 1 hour expiry

    if (error) throw error;

    // Open in new tab
    window.open(data.signedUrl, '_blank');
  } catch (error) {
    console.error('Error downloading attachment:', error);
    showError('Failed to download attachment. Please try again.');
  }
}

// Make downloadAttachment globally available
window.downloadAttachment = downloadAttachment;

// Show error message
function showError(message) {
  const container = document.getElementById('bulletinList');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #e11d48;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
        <h3 style="color: #e11d48; margin: 0 0 8px 0;">Error</h3>
        <p style="margin: 0; font-size: 14px;">${escapeHtml(message)}</p>
      </div>
    `;
  }
}

// Show loading state
function showLoading() {
  const container = document.getElementById('bulletinList');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div class="spinner" style="margin: 0 auto 16px;"></div>
        <p style="margin: 0; font-size: 14px;">Loading bulletins...</p>
      </div>
    `;
  }
}