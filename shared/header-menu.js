import { supabase } from '/js/supabase-client.js';

let finalizePostLogin = null;
try { const m = await import('/js/signup-with-documents.js'); finalizePostLogin = m.finalizePostLogin ?? null; } catch {}

const mount = document.getElementById('accountMenu');

function li(href, label){ return `<li role="menuitem"><a class="menu-link" href="${href}">${label}</a></li>`; }

function dropdownAuthed({ full_name, email, role }) {
  const isProv = role === 'provider_company' || role === 'provider_individual';
  const items = [
    li('/index.html', 'Dashboard'),
    li('/owner.html', 'My Business'),
    ...(isProv ? [
      li('/owner-activities.html', 'Activities'),
      li('/owner-bulletins.html', 'My Bulletins'),
      li('/admin-dashboard.html', 'Admin'),
    ] : [
      `<li role="menuitem"><button id="becomeProviderBtn" class="menu-link" type="button">Become a Provider</button></li>`
    ]),
    `<li role="menuitem"><button id="logoutBtn" class="menu-link" type="button">Logout</button></li>`
  ];
  return `
    <button class="account-chip" id="accountChip" aria-haspopup="menu" aria-expanded="false">
      ${full_name || email || 'Account'}
    </button>
    <ul class="account-menu" id="accountDropdown" role="menu">${items.join('')}</ul>
  `;
}

function ctaLoggedOut() {
  return `
    <div class="cta-inline">
      <a href="/auth.html#login">Login</a>
      <a href="/auth.html#signup">Sign up</a>
    </div>
  `;
}

async function init() {
  if (!mount) return console.error('header-menu: #accountMenu not found');

  const { data:{ user } } = await supabase.auth.getUser();

  // Not logged in → render Login / Sign up (do NOT redirect from header)
  if (!user) {
    mount.innerHTML = ctaLoggedOut();
    return;
  }

  // Coming back from signup? finalize once.
  const pending = localStorage.getItem('pendingSignup');
  if (pending && finalizePostLogin) {
    try { await finalizePostLogin(JSON.parse(pending)); }
    catch (e) { console.warn('finalizePostLogin failed', e); }
  }

  let role = 'customer', full_name = null;
  try {
    const { data } = await supabase.from('profiles').select('full_name,role').eq('user_id', user.id).maybeSingle();
    if (data) { role = data.role || 'customer'; full_name = data.full_name || null; }
  } catch (e) { console.warn('profile fetch error', e); }

  // render authed dropdown
  mount.innerHTML = dropdownAuthed({ full_name, email: user.email, role });

  // dropdown behavior
  const chip = document.getElementById('accountChip');
  const dd = document.getElementById('accountDropdown');
  const open = ()=>{ dd?.classList.add('open'); chip?.setAttribute('aria-expanded','true'); };
  const close= ()=>{ dd?.classList.remove('open'); chip?.setAttribute('aria-expanded','false'); };
  chip?.addEventListener('click', (e)=>{ e.stopPropagation(); dd?.classList.contains('open')?close():open(); });
  document.addEventListener('click', (e)=>{ if (dd && !dd.contains(e.target) && e.target !== chip) close(); });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

  // actions
  document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
    await supabase.auth.signOut();
    window.location.href = '/auth.html#login';
  });
  document.getElementById('becomeProviderBtn')?.addEventListener('click', async ()=>{
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, role: 'provider_individual' }, { onConflict:'user_id' });
    if (error) return alert(error.message);
    window.location.href = '/owner.html';
  });
}

init().catch(e=>console.error('header-menu init', e));