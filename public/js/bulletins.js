// bulletins.js — Using localStorage only (no backend, no Supabase)
import { createBulletin, getPublicBulletins } from '/js/api.js';
import { getCurrentUser, getBusinessByOwner } from '/js/auth-localstorage.js';
import { generateId } from '/js/auth-localstorage.js';

const SELECTORS = ['[data-bulletin="add"]', '#add-bulletin', '.js-add-bulletin', 'button[href="#add-bulletin"]', 'a[href="#add-bulletin"]'];

const modalRootId = 'modal-root';
let modalRoot, form, titleEl, bodyEl, categoryEl, startEl, endEl, urlEl, imgEl, publicEl, pinnedEl, draftEl, saveBtn;

function $q(sel, root) {
  root = root || document;
  return root.querySelector(sel);
}

function ensureModalRoot() {
  modalRoot = document.getElementById(modalRootId);
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = modalRootId;
    modalRoot.className = 'modal-root';
    document.body.appendChild(modalRoot);
  }
}

function normalizeOptionalDate(el) {
  if (!el || !el.value) return null;
  // If the control shows an invalid text (e.g., "08/01/2026 --:--"), drop it.
  if (!el.validity.valid) {
    el.value = '';
    return null;
  }
  const d = new Date(el.value);          // datetime-local string -> local time
  return isNaN(+d) ? null : d.toISOString(); // store as UTC ISO
}

function addDateFieldGuards(startEl, endEl) {
  if (startEl) {
    startEl.addEventListener('blur', () => {
      if (startEl.value && !startEl.validity.valid) startEl.value = '';
    });
  }
  if (endEl) {
    endEl.addEventListener('blur', () => {
      if (endEl.value && !endEl.validity.valid) endEl.value = '';
    });
  }
}

function buildModal() {
  ensureModalRoot();
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="add-bulletin-title">
      <div class="modal-header">
        <div class="modal-title" id="add-bulletin-title">Add Bulletin</div>
        <button class="modal-close" title="Close" data-close>&times;</button>
      </div>
      <form id="bulletin-form" novalidate class="modal-body form-grid">
        <label>Title</label>
        <input id="bulletin-title" type="text" placeholder="e.g. Weekend 50% Sale" required />
        
        <label>Details</label>
        <textarea id="bulletin-body" placeholder="Write your bulletin details..." required></textarea>

        <div class="form-row-2">
          <div>
            <label>Category</label>
            <select id="bulletin-category">
              <option value="">General</option>
              <option>Announcement</option>
              <option>Offer</option>
              <option>Event</option>
              <option>Hiring</option>
              <option>Alert</option>
            </select>
          </div>
          <div>
            <label>Link (optional)</label>
            <input id="bulletin-url" type="url" placeholder="https://example.com" />
          </div>
        </div>

        <div class="form-row-2">
          <div>
            <label>Start (optional)</label>
            <input id="bulletin-start" type="datetime-local" />
            <div class="form-help">When to start showing this</div>
          </div>
          <div>
            <label>End (optional)</label>
            <input id="bulletin-end" type="datetime-local" />
            <div class="form-help">Auto-expire after this time</div>
          </div>
        </div>

        <div>
          <label>Image (optional)</label>
          <input id="bulletin-image" type="file" accept="image/*" />
          <div class="form-help">A promo banner or photo</div>
        </div>

        <div class="form-row-2">
          <label class="switch"><input id="bulletin-public" type="checkbox" checked /> Public</label>
          <label class="switch"><input id="bulletin-pinned" type="checkbox" /> Pin to top</label>
        </div>
        <label class="switch"><input id="bulletin-draft" type="checkbox" /> Save as draft (don't publish yet)</label>

        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn primary" id="bulletin-save">Publish</button>
        </div>
      </form>
    </div>
  `;

  form = $q('#bulletin-form', modalRoot);
  titleEl = $q('#bulletin-title', modalRoot);
  bodyEl = $q('#bulletin-body', modalRoot);
  categoryEl = $q('#bulletin-category', modalRoot);
  startEl = $q('#bulletin-start', modalRoot);
  endEl = $q('#bulletin-end', modalRoot);
  urlEl = $q('#bulletin-url', modalRoot);
  imgEl = $q('#bulletin-image', modalRoot);
  publicEl = $q('#bulletin-public', modalRoot);
  pinnedEl = $q('#bulletin-pinned', modalRoot);
  draftEl = $q('#bulletin-draft', modalRoot);
  saveBtn = $q('#bulletin-save', modalRoot);

  modalRoot.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
  });
  if (form) form.addEventListener('submit', onSubmit);
  
  // Wire date field guards
  addDateFieldGuards(startEl, endEl);
}

function openModal() {
  if (!modalRoot) buildModal();
  modalRoot.classList.add('is-open');
  setTimeout(() => {
    if (titleEl) titleEl.focus();
  }, 0);
}

function closeModal() {
  if (modalRoot) modalRoot.classList.remove('is-open');
  if (form) form.reset();
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function onSubmit(e) {
  e.preventDefault();
  const title = (titleEl && titleEl.value) ? titleEl.value.trim() : '';
  const body = (bodyEl && bodyEl.value) ? bodyEl.value.trim() : '';
  if (!title || !body) {
    if (form) form.reportValidity();
    return;
  }

  // normalize optional fields
  const category = (categoryEl && categoryEl.value) ? categoryEl.value.trim() : null;
  const link_url = (urlEl && urlEl.value) ? urlEl.value.trim() : null;
  const is_public = publicEl && publicEl.checked ? true : false;
  const pinned = pinnedEl && pinnedEl.checked ? true : false;
  const is_published = draftEl && draftEl.checked ? false : true;
  const status = is_published ? 'published' : 'draft';

  // Sanitize dates
  const normalize = (el) => {
    if (!el || !el.value || !el.validity || !el.validity.valid) return null;
    return new Date(el.value).toISOString();
  };
  const start_at = normalize(startEl);
  const end_at = normalize(endEl);
  if (start_at && end_at && new Date(start_at) > new Date(end_at)) {
    alert('End must be after Start');
    return;
  }

  // ensure auth and check business ownership
  const user = getCurrentUser();
  if (!user || !user.id) {
    location.href = '/auth.html';
    return;
  }
  const userId = user.id;
  
  // Check if user owns a business
  const business = getBusinessByOwner(userId);
  if (!business) {
    alert('You need to own a business to post bulletins. Please create a business profile first.');
    return;
  }
  
  const businessId = business.id;

  // generate ID
  const id = generateId();

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = is_published ? 'Publishing…' : 'Saving…';
  }

  try {
    // Handle image upload if provided
    let cover_image_url = null;
    if (imgEl && imgEl.files && imgEl.files.length > 0) {
      const file = imgEl.files[0];
      cover_image_url = await fileToBase64(file);
    }

    // Create bulletin data
    const bulletinData = {
      type: 'bulletin',
      title,
      description: body,
      location: null,
      start_at: start_at,
      end_at: end_at,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      link: link_url,
      status,
      is_published: status === 'published',
      cover_image_url: cover_image_url,
      business_id: businessId,
      category: category,
      pinned: pinned
    };

    // Create bulletin using localStorage
    await createBulletin(bulletinData);

    closeModal();
    // refresh list on the page if present
    if (window.refreshBulletinsList) {
      window.refreshBulletinsList(bulletinData);
    }
    // Reload page to show new bulletin
    window.location.reload();
  } catch (err) {
    alert(err.message || 'Failed to save bulletin');
    console.warn('[bulletins] submit error', err);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Publish';
    }
  }
}

function wireAddButton() {
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      el.addEventListener('click', (ev) => {
        if (ev.preventDefault) ev.preventDefault();
        openModal();
      });
      return true;
    }
  }
  console.warn('[bulletins] Add button not found; add data-bulletin="add" to your button');
  return false;
}

window.refreshBulletinsList = window.refreshBulletinsList || function appendRow(row) {
  const container = document.getElementById('bulletins-list') || document.querySelector('[data-bulletins="list"]');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'card';
  const when = new Date(row.created_at || Date.now()).toLocaleString();
  const badge = row.pinned ? '📌 ' : '';
  const cat = row.category ? `<span class="muted"> • ${row.category}</span>` : '';
  const img = row.cover_image_url ? `<div style="margin:.5rem 0"><img src="${row.cover_image_url}" alt="" style="max-width:100%;border-radius:12px;border:1px solid #232744"></div>` : '';
  const link = row.link ? `<div><a href="${row.link}" target="_blank" rel="noopener">Link</a></div>` : '';
  item.innerHTML = `<strong>${badge}${row.title}</strong>${cat}<div class="muted">${when}</div>${img}<p>${row.description || row.body}</p>${link}`;
  container.prepend(item);
};

document.addEventListener('DOMContentLoaded', () => {
  wireAddButton();
});
