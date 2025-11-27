// public/js/header-auth-slot.js v14 - Using backend API with graceful error handling
import { getCurrentUser, logout as apiLogout } from '/js/api.js';

console.log('[header-auth-slot] Module loaded');

const SELS = [
  '#auth-slot', '[data-auth-slot]', '.auth-slot',
  '.nav-actions', '.header-actions', '.header-right', '.navbar-right'
];

let hasBackendError = false; // Track if backend is unavailable
let isPainting = false; // Track if currently painting to prevent concurrent paints

function findHeaderRight() {
  for (const s of SELS) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  // Heuristic: last flex child in header/nav
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
    console.warn('[auth-slot] no header container found; create a <span id="auth-slot"> where your login buttons live.');
    return null;
  }

  slot = document.createElement('span');
  slot.id = 'auth-slot';
  // Fallback buttons (no-JS & while hydrating)
  slot.innerHTML = `
    <a class="btn" href="/auth.html#login">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  mount.appendChild(slot);
  return slot;
}

function initials(name='') { const s=(name||'').trim(); return (s[0]||'?').toUpperCase(); }

async function getProfile(userId) {
  // Profile data comes from user object now
  // Can be enhanced later with separate profile endpoint
  return { full_name: '', avatar_url: '' };
}

// Count unread messages for the current user
function getUnreadMessageCount(userId) {
  try {
    const inboxMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
    
    // Filter messages for this user
    const userMessages = inboxMessages.filter(m => 
      (m.toUserId === userId || m.user_id === userId) && m.from === 'admin'
    );
    
    // Count unread messages (messages without read_at timestamp)
    const unreadCount = userMessages.filter(m => {
      const hasReadAt = m.read_at && m.read_at.trim() !== '';
      const isExplicitlyUnread = m.unread === true;
      const isNotExplicitlyRead = m.unread !== false;
      
      // Message is unread if it doesn't have read_at timestamp
      return !hasReadAt && (isExplicitlyUnread || isNotExplicitlyRead);
    }).length;
    
    return unreadCount;
  } catch (error) {
    console.warn('[header-auth-slot] Error counting unread messages:', error);
    return 0;
  }
}

function renderSignedOut(slot){
  slot.innerHTML = `
    <a class="btn" href="/auth.html#login">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  slot.classList.remove('hydrating');
}

function renderSignedIn(slot, user, profile){
  console.log('[auth-slot] renderSignedIn called with:', { user: user?.email, profile: profile?.full_name });
  const name = profile?.full_name || user?.name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || '';
  const avatar = avatarUrl
    ? `<img src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2,#232744)">`
    : `<div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initials(name)}</div>`;

  // Get unread message count
  const unreadCount = getUnreadMessageCount(user.id);
  const inboxBadge = unreadCount > 0 
    ? `<span class="inbox-badge" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border-radius:10px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;padding:0 5px;border:2px solid var(--ui-1,#101321);">${unreadCount > 99 ? '99+' : unreadCount}</span>`
    : '';

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:200px;z-index:1000;padding:8px">
        <a class="btn" style="width:100%;margin:4px 0" href="/registrations.html">Registrations</a>
        <a class="btn" style="width:100%;margin:4px 0;position:relative" href="/inbox.html" id="inbox-link">
          <i class="fas fa-inbox"></i> Inbox
          ${inboxBadge}
        </a>
        <a class="btn" style="width:100%;margin:4px 0" id="auth-profile-link" href="#">Profile</a>
        <button class="btn" id="auth-logout" style="width:100%;margin:4px 0">Log out</button>
      </div>
    </div>
  `;
  
  console.log('[auth-slot] renderSignedIn - HTML set, buttons should be visible');

  const btn = slot.querySelector('#auth-avatar-btn');
  const menu = slot.querySelector('#auth-menu');
  const logoutBtn = slot.querySelector('#auth-logout');

  // Wire up profile link - ALWAYS goes to /owner.html (never signup/login)
  const profileLink = slot.querySelector('#auth-profile-link');
  if (profileLink) {
    profileLink.href = '/owner.html';
    // Ensure we never redirect to auth pages if user is logged in
    profileLink.addEventListener('click', (e) => {
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
      // Token is cleared by apiLogout, now repaint header
      paint();
      location.href = '/auth.html';
    } catch (error) {
      console.error('[auth-slot] Logout error:', error);
      // Still repaint and redirect even on error
      paint();
      location.href = '/auth.html';
    }
  });

  slot.classList.remove('hydrating');
  
  // Update inbox badge when storage changes (messages read)
  if (user?.id) {
    updateInboxBadge(user.id);
  }
}

// Function to update inbox badge after messages are read
function updateInboxBadge(userId) {
  const inboxLink = document.querySelector('#inbox-link');
  if (!inboxLink || !userId) return;
  
  const unreadCount = getUnreadMessageCount(userId);
  
  // Remove existing badge
  const existingBadge = inboxLink.querySelector('.inbox-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  // Add badge if there are unread messages
  if (unreadCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'inbox-badge';
    badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border-radius:10px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;padding:0 5px;border:2px solid var(--ui-1,#101321);';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
    inboxLink.appendChild(badge);
  }
}

async function paint() {
  // Prevent concurrent paints
  if (isPainting) {
    console.log('[auth-slot] Paint already in progress, skipping');
    return;
  }
  
  const slot = ensureSlot();
  if (!slot) return;
  
  // If backend is unavailable, render signed out and stop
  if (hasBackendError) {
    renderSignedOut(slot);
    return;
  }
  
  isPainting = true;
  slot.classList.add('hydrating');

  try {
    const user = await getCurrentUser();
    console.log('[auth-slot] paint - session check:', { hasUser: !!user, email: user?.email });
    
    if (!user) {
      console.log('[auth-slot] paint - no user, rendering signed out');
      renderSignedOut(slot);
      return;
    }

    const profile = await getProfile(user.id);
    console.log('[auth-slot] paint - rendering signed in for:', user.email);
    renderSignedIn(slot, user, profile);
  } catch (error) {
    // Check if it's a 404 or network error - mark backend as unavailable
    if (error.message?.includes('404') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      console.warn('[auth-slot] Backend unavailable, stopping retries:', error.message);
      hasBackendError = true;
    } else {
      console.error('[auth-slot] paint error:', error);
    }
    renderSignedOut(slot);
  } finally {
    isPainting = false;
  }
}

// Paint on DOM ready - wait a bit for header to load
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure header is loaded
  setTimeout(paint, 100);
});

// Also paint on page show (back/forward navigation)
window.addEventListener('pageshow', paint);

// Periodic session check as fallback - ONLY if backend is available
let pollInterval = null;
let lastUserState = null; // Track last known user state to prevent unnecessary repaints

function startPolling() {
  if (pollInterval) return; // Already polling
  
  pollInterval = setInterval(async () => {
    // Stop polling if backend is unavailable
    if (hasBackendError) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    
    const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
    if (!slot) return;
    
    try {
      const user = await getCurrentUser();
      const currentUserId = user?.id || null;
      
      // Only repaint if user state actually changed
      if (currentUserId !== lastUserState) {
        console.log('[auth-slot] User state changed, repainting');
        lastUserState = currentUserId;
        paint();
      }
    } catch (error) {
      // If backend becomes unavailable, stop polling
      if (error.message?.includes('404') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.status === 401) {
        console.warn('[auth-slot] Backend unavailable during polling, stopping');
        hasBackendError = true;
        clearInterval(pollInterval);
        pollInterval = null;
        lastUserState = null;
      } else {
        console.error('[auth-slot] periodic check error:', error);
      }
    }
  }, 30000); // Check every 30 seconds (reduced frequency to prevent excessive repaints)
}

// Start polling after initial paint
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(startPolling, 3000); // Wait 3 seconds before starting polling
});

// Listen for storage changes to update inbox badge when messages are read
window.addEventListener('storage', (e) => {
  if (e.key === 'ch122_inbox_messages') {
    // Storage event fires on other tabs, but we can also listen for custom events
    const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
    if (slot) {
      // Repaint to update badge
      paint();
    }
  }
});

// Also listen for custom events from the same tab (when inbox page marks messages as read)
window.addEventListener('inbox-updated', () => {
  const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
  if (slot) {
    paint();
  }
});
