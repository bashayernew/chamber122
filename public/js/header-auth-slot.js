// public/js/header-auth-slot.js - Using localStorage only (no backend, no API)
import { getCurrentUser, logout } from '/js/auth-localstorage.js';

console.log('[header-auth-slot] Module loaded');

const SELS = [
  '#auth-slot', '[data-auth-slot]', '.auth-slot',
  '.nav-actions', '.header-actions', '.header-right', '.navbar-right'
];

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

function initials(name) {
  const s = (name || '').trim();
  return (s[0] || '?').toUpperCase();
}

// Count unread messages for the current user
function getUnreadMessageCount(userId) {
  try {
    let unreadCount = 0;
    
    // Count admin messages
    const inboxMessages = JSON.parse(localStorage.getItem('ch122_inbox_messages') || '[]');
    const userMessages = inboxMessages.filter(m => 
      (m.toUserId === userId || m.user_id === userId) && m.from === 'admin'
    );
    
    const adminUnread = userMessages.filter(m => {
      const hasReadAt = m.read_at && m.read_at.trim() !== '';
      const isExplicitlyUnread = m.unread === true;
      const isNotExplicitlyRead = m.unread !== false;
      
      return !hasReadAt && (isExplicitlyUnread || isNotExplicitlyRead);
    }).length;
    unreadCount += adminUnread;
    
    // Count user-to-user messages
    try {
      const userMessages = JSON.parse(localStorage.getItem('ch122_user_messages') || '[]');
      const userUnread = userMessages.filter(m => 
        m.toUserId === userId && 
        (!m.read_at || m.unread === true)
      ).length;
      unreadCount += userUnread;
    } catch (err) {
      console.warn('[header-auth-slot] Error counting user messages:', err);
    }
    
    return unreadCount;
  } catch (error) {
    console.warn('[header-auth-slot] Error counting unread messages:', error);
    return 0;
  }
}

function renderSignedOut(slot) {
  slot.innerHTML = `
    <a class="btn" href="/auth.html#login">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  slot.classList.remove('hydrating');
}

function renderSignedIn(slot, user) {
  const isAdminUser = user.role === 'admin';
  console.log('[auth-slot] renderSignedIn called with:', { user: user ? user.email : 'none' });
  const name = user.name || user.email || 'Account';
  const avatarUrl = user.avatar_url || '';
  const avatar = avatarUrl
    ? `<img src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2,#232744)">`
    : `<div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initials(name)}</div>`;

  // Get unread message count
  const unreadCount = getUnreadMessageCount(user.id);
  const inboxBadge = unreadCount > 0 ? `<span class="badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : '';

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user.email || '').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:200px;z-index:1000;padding:8px">
        ${isAdminUser ? `<a class="btn" style="width:100%;margin:4px 0;background:#f2c64b20;color:#f2c64b;border:1px solid #f2c64b;" href="/admin.html"><i class="fas fa-shield-alt"></i> Admin Dashboard</a>` : ''}
        <a class="btn" style="width:100%;margin:4px 0" href="/registrations.html">Registrations</a>
        <a class="btn" style="width:100%;margin:4px 0;display:flex;justify-content:space-between;align-items:center;" href="/inbox.html">
          <span><i class="fas fa-inbox"></i> Inbox</span>
          ${inboxBadge}
        </a>
        <a class="btn" style="width:100%;margin:4px 0" id="auth-profile-link" href="/owner.html">Profile</a>
        <button class="btn" id="auth-logout" style="width:100%;margin:4px 0">Log out</button>
      </div>
    </div>
  `;
  slot.classList.remove('hydrating');

  // Setup dropdown toggle
  const avatarBtn = slot.querySelector('#auth-avatar-btn');
  const menu = slot.querySelector('#auth-menu');
  if (avatarBtn && menu) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'block';
      avatarBtn.setAttribute('aria-expanded', !isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!slot.contains(e.target)) {
        menu.style.display = 'none';
        avatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Setup logout
  const logoutBtn = slot.querySelector('#auth-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        logout();
        window.location.href = '/';
      } catch (error) {
        console.error('[auth-slot] Logout error:', error);
        // Still redirect even if logout fails
        window.location.href = '/';
      }
    });
  }
}

async function paint() {
  if (isPainting) {
    console.log('[auth-slot] Paint already in progress, skipping');
    return;
  }
  isPainting = true;

  try {
    const slot = ensureSlot();
    if (!slot) {
      isPainting = false;
      return;
    }

    slot.classList.add('hydrating');
    
    const user = getCurrentUser();
    
    console.log('[auth-slot] paint - session check:', { hasUser: !!user, email: user ? user.email : undefined });
    
    if (!user) {
      console.log('[auth-slot] paint - no user, rendering signed out');
      renderSignedOut(slot);
      isPainting = false;
      return;
    }

    renderSignedIn(slot, user);
  } catch (error) {
    console.warn('[auth-slot] paint error:', error);
    const slot = ensureSlot();
    if (slot) {
      renderSignedOut(slot);
    }
  } finally {
    isPainting = false;
  }
}

// Initial paint
paint();

// Listen for storage changes (cross-tab updates)
window.addEventListener('storage', (e) => {
  if (e.key === 'chamber122_session') {
    paint();
  }
});

// Listen for custom events (same-tab updates)
window.addEventListener('auth-changed', paint);

// Export for use in other modules
export { getUnreadMessageCount };
