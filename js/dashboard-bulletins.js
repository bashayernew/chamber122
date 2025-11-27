// js/dashboard-bulletins.js - Dashboard bulletins list
import { getMyBulletins, getBulletinById } from './api.js';

let myBulletins = [];

// Show bulletin details (reuse from bulletins.js if available)
async function showBulletinDetails(bulletinId) {
  try {
    const bulletin = await getBulletinById(bulletinId);
    if (!bulletin) {
      alert('Bulletin not found');
      return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const createdDate = new Date(bulletin.created_at).toLocaleDateString();
    const businessName = bulletin.business_name || bulletin.business_display_name || 'Unknown Business';
    const businessLogo = bulletin.business_logo_url || '';

    modal.innerHTML = `
      <div class="modal-content" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;width:90%;max-width:600px;max-height:90vh;overflow-y:auto;position:relative;">
        <div class="modal-header" style="padding:20px;border-bottom:1px solid #2a2a2a;position:relative;">
          <button class="modal-close" style="position:absolute;top:15px;right:20px;background:none;border:none;color:#a0a0a0;font-size:1.5rem;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">&times;</button>
          <h2 style="margin:0;color:#e0e0e0;">${escapeHtml(bulletin.title)}</h2>
          <p style="margin:5px 0 0 0;color:#a0a0a0;font-size:0.9rem;">${createdDate}</p>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
            ${businessLogo ? `<img src="${escapeHtml(businessLogo)}" alt="${escapeHtml(businessName)}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">` : ''}
            <span style="color:#a0a0a0;font-weight:500;">${escapeHtml(businessName)}</span>
          </div>
          ${bulletin.category ? `<div style="margin-bottom:10px;"><span style="padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:500;color:white;background:#374151;">${escapeHtml(bulletin.category)}</span></div>` : ''}
          <div style="color:#c0c0c0;line-height:1.6;white-space:pre-wrap;">${escapeHtml(bulletin.body || bulletin.content || '')}</div>
          ${bulletin.url ? `<div style="margin-top:15px;"><a href="${escapeHtml(bulletin.url)}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:none;">View Link →</a></div>` : ''}
          <div style="margin-top:15px;padding-top:15px;border-top:1px solid #2a2a2a;">
            <span style="color:#a0a0a0;font-size:0.9rem;">Status: </span>
            <span style="color:${bulletin.is_published ? '#10b981' : '#f59e0b'};font-weight:500;">
              ${bulletin.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>
    `;

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  } catch (error) {
    console.error('[dashboard-bulletins] Error loading details:', error);
    alert('Failed to load bulletin details');
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render bulletins list
function renderBulletins() {
  const container = document.getElementById('dashboard-bulletins-list');
  if (!container) {
    console.warn('[dashboard-bulletins] Container not found');
    return;
  }

  if (myBulletins.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#a0a0a0;padding:40px;">No bulletins yet. <a href="/bulletin.html" style="color:var(--gold);">Create your first bulletin</a></div>';
    return;
  }

  container.innerHTML = myBulletins.map(bulletin => {
    const createdDate = new Date(bulletin.created_at).toLocaleDateString();
    const snippet = (bulletin.body || bulletin.content || '').substring(0, 100) + '...';
    const statusBadge = bulletin.is_published 
      ? '<span style="padding:4px 8px;background:#10b981;color:white;border-radius:4px;font-size:0.8rem;">Published</span>'
      : '<span style="padding:4px 8px;background:#f59e0b;color:white;border-radius:4px;font-size:0.8rem;">Draft</span>';

    return `
      <div class="card" style="margin-bottom:20px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <h3 style="margin:0;color:#e0e0e0;">${escapeHtml(bulletin.title)}</h3>
          ${statusBadge}
        </div>
        <p style="color:#c0c0c0;margin:10px 0;">${escapeHtml(snippet)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;">
          <span style="color:#a0a0a0;font-size:0.9rem;">${createdDate}</span>
          <button class="btn btn-primary" data-bulletin-id="${bulletin.id}" style="padding:8px 16px;">
            View Details
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('[data-bulletin-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bulletinId = btn.getAttribute('data-bulletin-id');
      showBulletinDetails(bulletinId);
    });
  });
}

// Load my bulletins
async function loadMyBulletins() {
  try {
    myBulletins = await getMyBulletins();
    renderBulletins();
  } catch (error) {
    console.error('[dashboard-bulletins] Error loading bulletins:', error);
    const container = document.getElementById('dashboard-bulletins-list');
    if (container) {
      container.innerHTML = '<div style="text-align:center;color:#a0a0a0;padding:40px;">Failed to load bulletins.</div>';
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMyBulletins);
} else {
  loadMyBulletins();
}

