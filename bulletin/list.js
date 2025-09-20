// Bulletin List Management
import { supabase } from '../js/supabase-client.js';

let bulletins = [];

// Initialize bulletin feed on page load
document.addEventListener('DOMContentLoaded', async () => {
  await reloadBulletinFeed();
});

// Export function for external calls (after publish/draft)
export async function reloadBulletinFeed() {
  try {
    console.log('Loading bulletin feed...');
    
    const { data, error } = await supabase
      .from('bulletins')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bulletins:', error);
      showError('Failed to load bulletins. Please refresh the page.');
      return;
    }

    bulletins = data || [];
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

  container.innerHTML = bulletins.map(bulletin => createBulletinCard(bulletin)).join('');
}

// Create individual bulletin card
function createBulletinCard(bulletin) {
  const typeLabels = {
    announcement: 'Announcement',
    job: 'Job',
    training: 'Training',
    funding: 'Funding'
  };

  const typeColors = {
    announcement: 'type-announcement',
    job: 'type-job',
    training: 'type-training',
    funding: 'type-funding'
  };

  const description = bulletin.description || '';
  const preview = description.length > 280 ? description.substring(0, 280) + '...' : description;
  
  const deadline = bulletin.deadline ? formatDate(bulletin.deadline) : null;
  const location = bulletin.location || null;
  
  let attachmentHtml = '';
  if (bulletin.attachment_path) {
    attachmentHtml = `
      <div class="bulletin-attachment">
        <a href="#" onclick="downloadAttachment('${bulletin.attachment_path}')">
          <i class="fas fa-paperclip"></i>
          Download Attachment
        </a>
      </div>
    `;
  }

  return `
    <div class="bulletin-card">
      <div class="bulletin-header">
        <div>
          <h3 class="bulletin-title">${escapeHtml(bulletin.title)}</h3>
          <span class="type-pill ${typeColors[bulletin.type] || 'type-announcement'}">
            ${typeLabels[bulletin.type] || 'Announcement'}
          </span>
        </div>
      </div>
      
      <p class="bulletin-description">${escapeHtml(preview)}</p>
      
      <div class="bulletin-meta">
        ${location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}</span>` : ''}
        ${deadline ? `<span><i class="fas fa-calendar"></i> Deadline: ${deadline}</span>` : ''}
        <span><i class="fas fa-clock"></i> ${formatDate(bulletin.created_at)}</span>
      </div>
      
      ${attachmentHtml}
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