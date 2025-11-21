// public/js/header-auth-slot.js v12
import { supabase } from './supabase-client.global.js';

console.log('[header-auth-slot] Module loaded, supabase available:', !!supabase);

const SELS = [
  '#auth-slot', '[data-auth-slot]', '.auth-slot',
  '.nav-actions', '.header-actions', '.header-right', '.navbar-right'
];

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

async function getProfile(userId){
  if (!userId) return { full_name: '', avatar_url: '' };
  let q = supabase.from('profiles').select('full_name, avatar_url').eq('user_id', userId).maybeSingle();
  let { data, error } = await q;
  if (error && (error.code === '42703' || (error.message||'').includes('avatar_url'))) {
    ({ data, error } = await supabase.from('profiles').select('full_name').eq('user_id', userId).maybeSingle());
  }
  if (error) { console.warn('[auth-slot] profiles fetch', error); return { full_name:'', avatar_url:'' }; }
  return data || { full_name:'', avatar_url:'' };
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
  const name = profile?.full_name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const avatar = avatarUrl
    ? `<img src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2,#232744)">`
    : `<div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initials(name)}</div>`;

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:200px;z-index:1000;padding:8px">
        <a class="btn" style="width:100%;margin:4px 0" href="/dashboard.html">Dashboard</a>
        <a class="btn" style="width:100%;margin:4px 0" id="auth-profile-link" href="#">Profile</a>
        <button class="btn" id="auth-logout" style="width:100%;margin:4px 0">Log out</button>
      </div>
    </div>
  `;
  
  console.log('[auth-slot] renderSignedIn - HTML set, buttons should be visible');

  const btn = slot.querySelector('#auth-avatar-btn');
  const menu = slot.querySelector('#auth-menu');
  const logoutBtn = slot.querySelector('#auth-logout');

  // Wire up profile link with override support
  const profileHref =
    window.PROFILE_URL ||               // optional global override if you have one
    '/owner.html';                      // default profile page

  const profileLink = slot.querySelector('#auth-profile-link');
  if (profileLink) profileLink.href = profileHref;

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
    await supabase.auth.signOut();
    location.href = '/auth.html';
  });

  slot.classList.remove('hydrating');
}

async function paint() {
  const slot = ensureSlot();
  if (!slot) return;
  slot.classList.add('hydrating');

  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    console.log('[auth-slot] paint - session check:', { hasUser: !!user, email: user?.email });
    
    if (!user) {
      console.log('[auth-slot] paint - no user, rendering signed out');
      return renderSignedOut(slot);
    }

    const profile = await getProfile(user.id);
    console.log('[auth-slot] paint - rendering signed in for:', user.email);
    renderSignedIn(slot, user, profile);
  } catch (error) {
    console.error('[auth-slot] paint error:', error);
    renderSignedOut(slot);
  }
}

// More robust auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[auth-slot] auth state change:', { event, hasUser: !!session?.user, email: session?.user?.email });
  
  const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot') || ensureSlot();
  if (!slot) {
    console.warn('[auth-slot] no slot found for auth state change');
    return;
  }
  
  if (!session?.user) {
    console.log('[auth-slot] auth state change - rendering signed out');
    renderSignedOut(slot);
  } else {
    console.log('[auth-slot] auth state change - rendering signed in for:', session.user.email);
    getProfile(session.user.id).then(p => renderSignedIn(slot, session.user, p));
  }
});

// Paint on DOM ready
document.addEventListener('DOMContentLoaded', paint);

// Also paint on page show (back/forward navigation)
window.addEventListener('pageshow', paint);

// Periodic session check as fallback
setInterval(async () => {
  const slot = document.querySelector('#auth-slot, [data-auth-slot], .auth-slot');
  if (!slot) return;
  
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    const isCurrentlySignedIn = slot.querySelector('#auth-avatar-btn');
    
    // If we think we're signed in but actually not, or vice versa, repaint
    if ((user && !isCurrentlySignedIn) || (!user && isCurrentlySignedIn)) {
      console.log('[auth-slot] periodic check - session mismatch, repainting');
      paint();
    }
  } catch (error) {
    console.error('[auth-slot] periodic check error:', error);
  }
}, 5000); // Check every 5 seconds