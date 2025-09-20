/* Self-healing header auth slot */
const PROJECT_REF = 'gidbvemmqffogakcepka';

async function getSupabaseClient() {
  // Prefer global client if another script already created it
  if (window._sb) return window._sb;

  // Try importing our client module (absolute path)
  try {
    const mod = await import('/js/supabase-client.js?v=20');
    const sb = mod.supabase || window._sb;
    if (sb) return (window._sb = sb);
  } catch (e) { console.warn('[auth-slot] import supabase-client failed', e); }

  // Last resort: create a client here
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
      const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
        global: { headers: { 'x-client-info': 'ch122-header-auth-slot' } }
      });
      return (window._sb = sb);
    } catch (e) {
      console.warn('[auth-slot] fallback createClient failed', e);
    }
  }
  return null;
}

function findSlot() {
  return document.querySelector('#auth-slot') ||
         document.querySelector('[data-auth-slot]') ||
         document.querySelector('.auth-slot');
}

function initialsFrom(name='') { const s=(name||'').trim()||'?'; return s[0].toUpperCase(); }

async function getProfile(sb, uid) {
  if (!uid) return { full_name:'', avatar_url:'' };
  // try full_name+avatar_url; if column missing, retry with full_name only
  let { data, error } = await sb.from('profiles').select('full_name, avatar_url').eq('user_id', uid).maybeSingle();
  if (error && (error.code === '42703' || (error.message||'').includes('avatar_url'))) {
    ({ data, error } = await sb.from('profiles').select('full_name').eq('user_id', uid).maybeSingle());
  }
  if (error) { console.warn('[auth-slot] profile fetch', error); return { full_name:'', avatar_url:'' }; }
  return data || { full_name:'', avatar_url:'' };
}

function renderSignedOut(slot) {
  slot.innerHTML = `
    <a class="btn" href="/auth.html">Login</a>
    <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
  `;
  slot.classList.remove('hydrating'); slot.classList.add('hydrated');
}

function renderSignedIn(slot, user, profile) {
  const name = profile?.full_name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const avatar = avatarUrl
    ? `<img class="avatar" src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2,#232744)">`
    : `<div class="avatar" style="width:32px;height:32px;border-radius:50%;display:inline-grid;place-items:center;background:var(--ui-2,#14172a);border:1px solid var(--border-2,#232744)">${initialsFrom(name)}</div>`;

  slot.innerHTML = `
    <div class="userbox" style="position:relative;display:inline-block">
      <button id="auth-avatar-btn" class="btn" aria-haspopup="true" aria-expanded="false" style="display:inline-flex;align-items:center;gap:8px">
        ${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span>
      </button>
      <div id="auth-menu" class="dropdown" style="position:absolute;right:0;top:calc(100% + 6px);display:none;background:var(--ui-1,#101321);border:1px solid var(--border-2,#232744);border-radius:12px;min-width:180px;z-index:1000;padding:8px">
        <a class="btn" style="width:100%;margin:4px 0" href="/dashboard.html">Dashboard</a>
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
    btn?.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', e => { if (!slot.contains(e.target)) { if (menu) menu.style.display='none'; btn?.setAttribute('aria-expanded','false'); }});
  logoutBtn?.addEventListener('click', async () => { const sb = await getSupabaseClient(); await sb?.auth.signOut(); location.href='/auth.html'; });

  slot.classList.remove('hydrating'); slot.classList.add('hydrated');
}

async function hydrate() {
  const slot = findSlot();
  if (!slot) return;
  slot.classList.add('hydrating');

  const sb = await getSupabaseClient();
  if (!sb) { console.warn('[auth-slot] no supabase client'); return renderSignedOut(slot); }

  // If auth-session.js exists, great — but we can proceed without it.
  let email = null, user = null;
  try {
    const { data } = await sb.auth.getSession();
    email = data?.session?.user?.email || null;
    user  = data?.session?.user || null;
  } catch (e) { console.warn('[auth-slot] getSession failed', e); }

  if (!email) return renderSignedOut(slot);
  const profile = await getProfile(sb, user.id);
  renderSignedIn(slot, user, profile);

  // Live updates
  try {
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      if (!sess?.user) return renderSignedOut(slot);
      getProfile(sb, sess.user.id).then(p => renderSignedIn(slot, sess.user, p));
    });
    window.addEventListener('beforeunload', () => sub?.subscription?.unsubscribe?.());
  } catch (e) { console.warn('[auth-slot] onAuthStateChange failed', e); }
}

document.addEventListener('DOMContentLoaded', hydrate);