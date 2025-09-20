// bulletins.js — rich modal + insert flow with optional image upload
import { supabase } from './supabase-client.js';
import { ensureSessionHydrated } from './auth-session.js';

const SELECTORS = ['[data-bulletin="add"]', '#add-bulletin', '.js-add-bulletin', 'button[href="#add-bulletin"]', 'a[href="#add-bulletin"]'];
const BUCKET = 'bulletins'; // make sure this bucket exists (public) in Supabase Storage

const modalRootId = 'modal-root';
let modalRoot, form, titleEl, bodyEl, categoryEl, startEl, endEl, urlEl, imgEl, publicEl, pinnedEl, draftEl, saveBtn;

function $q(sel, root=document) { return root.querySelector(sel); }
function ensureModalRoot() {
  modalRoot = document.getElementById(modalRootId);
  if (!modalRoot) { modalRoot = document.createElement('div'); modalRoot.id = modalRootId; modalRoot.className = 'modal-root'; document.body.appendChild(modalRoot); }
}

function normalizeOptionalDate(el) {
  if (!el || !el.value) return null;
  // If the control shows an invalid text (e.g., "08/01/2026 --:--"), drop it.
  if (!el.validity.valid) { el.value = ''; return null; }
  const d = new Date(el.value);          // datetime-local string -> local time
  return isNaN(+d) ? null : d.toISOString(); // store as UTC ISO
}

function addDateFieldGuards(startEl, endEl) {
  [startEl, endEl].forEach((el) => {
    el?.addEventListener('blur', () => {
      if (el.value && !el.validity.valid) el.value = ''; // auto-clear bad text
    });
  });
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

  modalRoot.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  form.addEventListener('submit', onSubmit);
  
  // Wire date field guards
  addDateFieldGuards(startEl, endEl);
}

function openModal() { if (!modalRoot) buildModal(); modalRoot.classList.add('is-open'); setTimeout(() => titleEl?.focus(), 0); }
function closeModal() { modalRoot?.classList.remove('is-open'); form?.reset(); }

async function onSubmit(e) {
  e.preventDefault();
  const title = (titleEl?.value || '').trim();
  const body = (bodyEl?.value || '').trim();
  if (!title || !body) return form.reportValidity();

  // normalize optional fields
  const category = (categoryEl?.value || '').trim() || null;
  const link_url = (urlEl?.value || '').trim() || null;
  const is_public = !!publicEl?.checked;
  const pinned = !!pinnedEl?.checked;
  const is_published = !draftEl?.checked;
  const status = is_published ? 'published' : 'draft';

  const start_at = normalizeOptionalDate(startEl);
  const end_at   = normalizeOptionalDate(endEl);

  if (start_at && end_at && new Date(start_at) > new Date(end_at)) {
    alert('End must be after Start');
    return;
  }

  // ensure auth
  const { data: s } = await supabase.auth.getSession();
  if (!s?.session?.user) { location.href = '/auth.html'; return; }
  const userId = s.session.user.id;

  // generate UUID client-side so we can upload image at a predictable path even before refresh
  const id = (crypto?.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now());

  saveBtn.disabled = true; saveBtn.textContent = is_published ? 'Publishing…' : 'Saving…';
  try {
    // 1) insert bulletin row (without image_url first)
    const insert = {
      id, owner_user_id: userId, title, body,
      category, link_url, start_at, end_at,
      is_public, pinned, is_published, status
    };
    const { data: row, error: insErr } = await supabase.from('bulletins').insert(insert).select().single();
    if (insErr) { 
      console.warn('[bulletins] insert error', insErr); 
      alert(insErr.message || 'Insert failed'); 
      throw insErr; 
    }

    // 2) optional image upload
    const file = imgEl?.files?.[0] || null;
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const image_url = pub?.publicUrl || null;

      if (image_url) {
        const { error: updErr } = await supabase.from('bulletins').update({ image_url }).eq('id', id);
        if (updErr) console.warn('[bulletins] image URL update error', updErr);
      }
    }

    closeModal();
    // refresh list on the page if present
    refreshBulletinsList?.(row);
  } catch (err) {
    alert(err?.message || 'Failed to save bulletin');
    console.warn('[bulletins] submit error', err);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Publish';
  }
}

function wireAddButton() {
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    if (el) { el.addEventListener('click', (ev) => { ev.preventDefault?.(); openModal(); }); return true; }
  }
  console.warn('[bulletins] Add button not found; add data-bulletin="add" to your button');
  return false;
}

window.refreshBulletinsList ??= function appendRow(row) {
  const container = document.getElementById('bulletins-list') || document.querySelector('[data-bulletins="list"]');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'card';
  const when = new Date(row.created_at || Date.now()).toLocaleString();
  const badge = row.pinned ? '📌 ' : '';
  const cat = row.category ? `<span class="muted"> • ${row.category}</span>` : '';
  const img = row.image_url ? `<div style="margin:.5rem 0"><img src="${row.image_url}" alt="" style="max-width:100%;border-radius:12px;border:1px solid #232744"></div>` : '';
  const link = row.link_url ? `<div><a href="${row.link_url}" target="_blank" rel="noopener">Link</a></div>` : '';
  item.innerHTML = `<strong>${badge}${row.title}</strong>${cat}<div class="muted">${when}</div>${img}<p>${row.body}</p>${link}`;
  container.prepend(item);
};

document.addEventListener('DOMContentLoaded', () => { wireAddButton(); });