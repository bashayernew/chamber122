// Session-aware header renderer for every page
import { supabase } from './supabase-client.js';
import { ensureSessionHydrated, onAnyAuthChange } from './auth-session.js';

function initialsFrom(str='?'){ const s=(str||'?').trim(); return s ? s[0].toUpperCase() : '?'; }

// tolerant fetch of profile (avatar_url might not exist yet)
async function getProfile(userId){
  if (!userId) return { full_name: '', avatar_url: '' };
  let { data, error } = await supabase.from('profiles')
    .select('full_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error?.code === '42703') {
    ({ data, error } = await supabase.from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle());
  }
  if (error) { console.warn('[site-header] profiles fetch', error); return { full_name: '', avatar_url: '' }; }
  return data || { full_name: '', avatar_url: '' };
}

function renderLoggedOut(container){
  container.innerHTML = `
    <header class="topbar">
      <div class="brand"><a href="/index.html">Chamber122</a></div>
      <div class="auth-ctas">
        <a class="btn" href="/auth.html">Log in</a>
        <a class="btn primary" href="/auth.html#signup">Sign up</a>
      </div>
    </header>
  `;
  const mount = document.getElementById('site-header');
  mount?.classList.add('hydrated');
}

function renderLoggedIn(container, { user, profile }){
  const name = profile?.full_name || user?.email || 'Account';
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    '';
  const avatar = avatarUrl
    ? `<img class="avatar" src="${avatarUrl}" alt="avatar">`
    : `<div class="avatar">${initialsFrom(name)}</div>`;

  container.innerHTML = `
    <header class="topbar">
      <div class="brand"><a href="/index.html">Chamber122</a></div>
      <div class="userbox dropdown" id="user-dropdown">
        <a href="/registrations.html" class="btn">Registrations</a>
        <div class="btn" id="avatar-btn" aria-haspopup="true" aria-expanded="false">
          ${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span>
        </div>
        <div class="dropdown-menu" id="user-menu">
          <a href="/settings.html">Settings</a>
          <a href="/documents.html">Documents</a>
          <button id="logout-btn">Log out</button>
        </div>
      </div>
    </header>
  `;

  const dd = container.querySelector('#user-dropdown');
  const btn = container.querySelector('#avatar-btn');
  const menu = container.querySelector('#user-menu');

  btn?.addEventListener('click', () => {
    dd.classList.toggle('open');
    btn.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) dd.classList.remove('open');
  });
  container.querySelector('#logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/auth.html';
  });
  
  const mount = document.getElementById('site-header');
  mount?.classList.add('hydrated');
}

async function paint(){
  const mount = document.getElementById('site-header');
  if (!mount) return;

  // Wait/rehydrate once at startup before deciding what to render
  const session = await ensureSessionHydrated();
  if (!session?.user) return renderLoggedOut(mount);

  const profile = await getProfile(session.user.id);
  renderLoggedIn(mount, { user: session.user, profile });
}

// Re-render whenever auth state changes (including INITIAL_SESSION)
onAnyAuthChange((_evt, session) => {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  if (!session?.user) renderLoggedOut(mount);
  else getProfile(session.user.id).then(p => renderLoggedIn(mount, { user: session.user, profile: p }));
});

// Initial paint
paint();