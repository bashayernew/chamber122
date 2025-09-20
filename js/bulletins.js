// bulletins.js — modal + insert flow
import { supabase } from './supabase-client.js';
import { ensureSessionHydrated } from './auth-session.js';

const SELECTORS = [
  '[data-bulletin="add"]',
  '#add-bulletin',
  '.js-add-bulletin',
  'button[href="#add-bulletin"]',
  'a[href="#add-bulletin"]',
];

const modalRootId = 'modal-root';
let modalRoot, form, titleEl, bodyEl, saveBtn, cancelBtn, closeBtn;

function $q(sel, root=document) { return root.querySelector(sel); }

function ensureModalRoot() {
  modalRoot = document.getElementById(modalRootId);
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = modalRootId;
    modalRoot.className = 'modal-root';
    document.body.appendChild(modalRoot);
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
      <form id="bulletin-form" class="modal-body">
        <label>Title</label>
        <input id="bulletin-title" type="text" placeholder="e.g. Weekly offers" required />
        <label>Details</label>
        <textarea id="bulletin-body" placeholder="Write your bulletin details..." required></textarea>
        <div class="modal-actions">
          <button type="button" class="btn" id="bulletin-cancel" data-close>Cancel</button>
          <button type="submit" class="btn primary" id="bulletin-save">Publish</button>
        </div>
      </form>
    </div>
  `;

  form = $q('#bulletin-form', modalRoot);
  titleEl = $q('#bulletin-title', modalRoot);
  bodyEl = $q('#bulletin-body', modalRoot);
  saveBtn = $q('#bulletin-save', modalRoot);
  cancelBtn = $q('#bulletin-cancel', modalRoot);
  closeBtn = $q('[data-close].modal-close', modalRoot);

  modalRoot.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
  });

  form.addEventListener('submit', onSubmit);
}

function openModal() {
  if (!modalRoot) buildModal();
  modalRoot.classList.add('is-open');
  setTimeout(() => titleEl?.focus(), 0);
}

function closeModal() {
  modalRoot?.classList.remove('is-open');
  if (form) form.reset();
}

async function onSubmit(e) {
  e.preventDefault();
  const title = (titleEl?.value || '').trim();
  const body = (bodyEl?.value || '').trim();
  if (!title || !body) return form.reportValidity();

  saveBtn.disabled = true; saveBtn.textContent = 'Publishing…';
  try {
    // ensure session
    const session = await ensureSessionHydrated();
    if (!session?.user) {
      location.href = '/auth.html';
      return;
    }
    const userId = session.user.id;

    // insert
    const { data, error } = await supabase
      .from('bulletins')
      .insert({ owner_user_id: userId, title, body })
      .select()
      .single();

    if (error) throw error;

    closeModal();

    // refresh list if the page has a list container
    refreshBulletinsList?.(data);
  } catch (err) {
    alert(err?.message || 'Failed to publish');
    console.warn('[bulletins] insert error', err);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Publish';
  }
}

// Hook up the "Add Bulletin" button(s)
function wireAddButton() {
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      el.addEventListener('click', (ev) => {
        // prevent <a href> from navigating
        ev.preventDefault?.();
        openModal();
      }, { once: false });
      return true;
    }
  }
  console.warn('[bulletins] Add button not found; add data-bulletin="add" to your button');
  return false;
}

// optional: simple list refresher; define window.refreshBulletinsList elsewhere to customize
window.refreshBulletinsList ??= function appendRow(row) {
  const container =
    document.getElementById('bulletins-list') ||
    document.querySelector('[data-bulletins="list"]');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'card';
  item.innerHTML = `<strong>${row.title}</strong><div class="muted">${new Date(row.created_at || Date.now()).toLocaleString()}</div><p>${row.body}</p>`;
  container.prepend(item);
};

document.addEventListener('DOMContentLoaded', () => {
  wireAddButton();
});
