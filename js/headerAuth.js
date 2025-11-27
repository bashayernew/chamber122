// js/headerAuth.js - Shared header authentication script for all pages
// This ensures consistent auth UI across the entire site

import { getCurrentUser, logout as apiLogout } from './api.js';

console.log('[headerAuth] Loading shared header auth script');

const SELS = [
  '#auth-slot', '[data-auth-slot]', '.auth-slot',
  '.nav-actions', '.header-actions', '.header-right', '.navbar-right'
];

let hasBackendError = false;

function findHeaderRight() {
  for (const s of SELS) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  const headers = document.querySelectorAll('header, .header, nav, .navbar');
  for (const h of headers) {
    const kids = [...h.querySelectorAll('*')].filter(e => getComputedStyle(e).display.includes('flex'));
    if (kids.length) return kids[kids.length - 1];
  }
  return null;
}

function ensureSlot() {
  let slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
  if (slot) return slot;

  const mount = findHeaderRight();
  if (!mount) {
    console.warn('[headerAuth] no header container found');
    return null;
  }

  slot = document.createElement('span');
  slot.id = 'auth-slot';
  slot.innerHTML = `
    <a class="btn" href="/auth.html#login">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  mount.appendChild(slot);
  return slot;
}

function initials(name='') {
  const s = (name || '').trim();
  return (s[0] || '?').toUpperCase();
}

function renderSignedOut(slot) {
  slot.innerHTML = `
    <a class="btn" href="/auth.html#login">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  slot.classList.remove('hydrating');
}

function renderSignedIn(slot, user) {
  const name = user?.name || user?.email || 'Account';
  const avatar = `<div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initials(name)}</div>`;

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user?.email || '').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:200px;z-index:1000;padding:8px">
        <a class="btn" style="width:100%;margin:4px 0" href="/registrations.html">Registrations</a>
        <a class="btn" style="width:100%;margin:4px 0" id="auth-profile-link" href="/owner.html">Profile</a>
        <button class="btn" id="auth-logout" style="width:100%;margin:4px 0">Log out</button>
      </div>
    </div>
  `;

  const btn = slot.querySelector('#auth-avatar-btn');
  const menu = slot.querySelector('#auth-menu');
  const logoutBtn = slot.querySelector('#auth-logout');

  // Profile link ALWAYS goes to /owner.html (never signup/login)
  const profileLink = slot.querySelector('#auth-profile-link');
  if (profileLink) {
    profileLink.href = '/owner.html';
    profileLink.addEventListener('click', (e) => {
      // Ensure we never redirect to auth pages if user is logged in
      e.preventDefault();
      window.location.href = '/owner.html';
    });
  }

  btn?.addEventListener('click', () => {
    const open = menu.style.display === 'block';
    menu.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('click', (e) => {
    if (!slot.contains(e.target)) {
      menu.style.display = 'none';
      btn?.setAttribute('aria-expanded', 'false');
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await apiLogout();
      paint();
      window.location.href = '/auth.html';
    } catch (error) {
      console.error('[headerAuth] Logout error:', error);
      paint();
      window.location.href = '/auth.html';
    }
  });

  slot.classList.remove('hydrating');
}

async function paint() {
  const slot = ensureSlot();
  if (!slot) return;

  if (hasBackendError) {
    renderSignedOut(slot);
    return;
  }

  slot.classList.add('hydrating');

  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return renderSignedOut(slot);
    }

    renderSignedIn(slot, user);
  } catch (error) {
    if (error.message?.includes('404') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')) {
      console.warn('[headerAuth] Backend unavailable, stopping retries');
      hasBackendError = true;
    } else {
      console.error('[headerAuth] paint error:', error);
    }
    renderSignedOut(slot);
  }
}

// Paint on DOM ready
document.addEventListener('DOMContentLoaded', paint);
window.addEventListener('pageshow', paint);

// Periodic session check (only if backend available)
let pollInterval = null;

function startPolling() {
  if (pollInterval) return;
  
  pollInterval = setInterval(async () => {
    if (hasBackendError) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    
    const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
    if (!slot) return;
    
    try {
      const user = await getCurrentUser();
      const isCurrentlySignedIn = slot.querySelector('#auth-avatar-btn');
      
      if ((user && !isCurrentlySignedIn) || (!user && isCurrentlySignedIn)) {
        paint();
      }
    } catch (error) {
      if (error.message?.includes('404') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        hasBackendError = true;
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(startPolling, 2000);
});

// Export for manual refresh if needed
window.refreshHeaderAuth = paint;

