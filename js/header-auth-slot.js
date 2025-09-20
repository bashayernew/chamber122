// header-auth-slot.js — upgrade only the auth portion of your existing header
import { supabase } from './supabase-client.js';
import { ensureSessionHydrated, onAnyAuthChange } from './auth-session.js';

const SLOT_SELECTORS = ['#auth-slot', '[data-auth-slot]', '.auth-slot'];

function findSlot() {
  for (const sel of SLOT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  console.warn('[auth-slot] no placeholder found; add id="auth-slot" to your header auth area');
  return null;
}

function initialsFrom(name = '') {
  const s = (name || '').trim() || '?';
  return s[0].toUpperCase();
}

async function getProfile(userId) {
  if (!userId) return { full_name: '', avatar_url: '' };

  // Prefer full_name + avatar_url; if avatar_url column doesn't exist, retry without it.
  let { data, error } = await supabase
    .from('profiles').select('full_name, avatar_url').eq('user_id', userId).maybeSingle();

  if (error && (error.code === '42703' || error.message?.includes('avatar_url'))) {
    ({ data, error } = await supabase
      .from('profiles').select('full_name').eq('user_id', userId).maybeSingle());
  }
  if (error) {
    console.warn('[auth-slot] profiles fetch', error);
    return { full_name: '', avatar_url: '' };
  }
  return data || { full_name: '', avatar_url: '' };
}

function renderSignedOut(slot) {
  slot.innerHTML = `
    <a class="btn" href="/auth.html">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  slot.classList.add('hydrated');
}

function renderSignedIn(slot, { user, profile }) {
  const name = profile?.full_name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const avatar = avatarUrl
    ? `<img class="avatar" src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2, #232744)">`
    : `<div class="avatar" style="width:32px;height:32px;border-radius:50%;display:inline-grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initialsFrom(name)}</div>`;

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:180px;z-index:1000;padding:8px">
        <a class="btn" style="width:100%;margin:4px 0" href="/dashboard.html">Dashboard</a>
        <a class="btn" style="width:100%;margin:4px 0" href="/settings.html">Settings</a>
        <button class="btn" id="auth-logout" style="width:100%;margin:4px 0">Log out</button>
      </div>
    </div>
  `;

  const btn = slot.querySelector('#auth-avatar-btn');
  const menu = slot.querySelector('#auth-menu');
  const logoutBtn = slot.querySelector('#auth-logout');

  btn?.addEventListener('click', () => {
    const open = menu?.style.display === 'block';
    menu.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', (e) => {
    if (!slot.contains(e.target)) {
      if (menu) menu.style.display = 'none';
      btn?.setAttribute('aria-expanded', 'false');
    }
  });
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/auth.html';
  });

  slot.classList.add('hydrated');
}

async function paint() {
  const slot = findSlot();
  if (!slot) return;

  // Wait for/rehydrate session first
  const session = await ensureSessionHydrated();
  if (!session?.user) return renderSignedOut(slot);

  const profile = await getProfile(session.user.id);
  renderSignedIn(slot, { user: session.user, profile });
}

onAnyAuthChange((_evt, session) => {
  const slot = findSlot();
  if (!slot) return;
  if (!session?.user) renderSignedOut(slot);
  else getProfile(session.user.id).then(p => renderSignedIn(slot, { user: session.user, profile: p }));
});

document.addEventListener('DOMContentLoaded', paint);
