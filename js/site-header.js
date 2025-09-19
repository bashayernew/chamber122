// Session-aware header renderer for every page
import { supabase } from './supabase-client.js';

const ENV_OK = Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
if (!ENV_OK) {
  console.warn('[site-header] Missing SUPABASE env on window; header will render in logged-out state only.');
}

function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function initialsFrom(str='?'){ const s=(str||'?').trim(); return s ? s[0].toUpperCase() : '?'; }

async function getProfile(userId){
  if (!userId) return { full_name: '', avatar_url: '' };

  // Try different approaches to fetch profile data
  try {
    // First try: full_name only (most likely to work)
    let { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[site-header] profiles fetch failed:', error);
      return { full_name: '', avatar_url: '' };
    }

    // If we got data, try to add avatar_url in a separate query
    if (data) {
      try {
        const { data: avatarData, error: avatarError } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!avatarError && avatarData) {
          data.avatar_url = avatarData.avatar_url;
        }
      } catch (avatarErr) {
        // Ignore avatar_url errors, just use full_name
        console.debug('[site-header] avatar_url not available:', avatarErr);
      }
    }

    return data || { full_name: '', avatar_url: '' };
  } catch (error) {
    console.warn('[site-header] profiles fetch exception:', error);
    return { full_name: '', avatar_url: '' };
  }
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
}

function renderLoggedIn(container, { user, profile }){
  const name = profile?.full_name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const avatar = avatarUrl ? `<img class="avatar" src="${avatarUrl}" alt="avatar">` : `<div class="avatar">${initialsFrom(name)}</div>`;

  container.innerHTML = `
    <header class="topbar">
      <div class="brand"><a href="/index.html">Chamber122</a></div>
      <div class="userbox dropdown" id="user-dropdown">
        <a href="/dashboard.html" class="btn">Dashboard</a>
        <div class="btn" id="avatar-btn" aria-haspopup="true" aria-expanded="false">${avatar}<span class="hide-sm">@${(user?.email||'').split('@')[0]}</span></div>
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
    // Full refresh so every page swaps to logged-out header immediately
    location.href = '/auth.html';
  });
}

async function paint(){
  const mount = document.getElementById('site-header');
  if (!mount) return; // page didn't opt-in
  let user = null;

  // fast path: use cached session
  const { data: sess } = await supabase.auth.getSession();
  user = sess?.session?.user || null;

  if (!user) {
    renderLoggedOut(mount);
    return;
  }

  const profile = await getProfile(user.id);
  renderLoggedIn(mount, { user, profile });
}

// react to auth changes across tabs/pages
supabase.auth.onAuthStateChange((_evt, session) => {
  const authed = Boolean(session?.user);
  const mount = document.getElementById('site-header');
  if (!mount) return;
  if (!authed) renderLoggedOut(mount); else getProfile(session.user.id).then(p => renderLoggedIn(mount, { user: session.user, profile: p }));
});

// initial paint
paint();
