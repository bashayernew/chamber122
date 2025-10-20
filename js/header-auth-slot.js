// Header Auth Slot - Classic Script (Compatible with global client)
(function() {
  'use strict';
  
  // Run once guard
  if (window.__headerAuthSlot_loaded__) return;
  window.__headerAuthSlot_loaded__ = true;
  
  console.log('[header-auth-slot.js] Classic version loading');
  
  // Get Supabase client from global singleton
  function getSupabase() {
    const client = window.__supabaseClient || window.supabase || window.supabaseClient || window.sb;
    if (!client) {
      console.error('[header-auth-slot] No Supabase client found in window');
    }
    return client;
  }
  
  // Wait for Supabase to be ready
  function waitForSupabase(callback) {
    const sb = getSupabase();
    if (sb) {
      console.log('[header-auth-slot] Supabase client ready');
      callback(sb);
      return;
    }
    
    // Wait for client to be available
    console.log('[header-auth-slot] Waiting for Supabase client...');
    const checkInterval = setInterval(() => {
      const sb = getSupabase();
      if (sb) {
        clearInterval(checkInterval);
        console.log('[header-auth-slot] Supabase client now ready');
        callback(sb);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('[header-auth-slot] Timeout waiting for Supabase client');
    }, 5000);
  }
  
  function el(sel){ return document.querySelector(sel); }
  function initials(n=''){ const s=(n||'').trim(); return (s[0]||'?').toUpperCase(); }

  async function getProfile(userId){
    if(!userId) return { full_name:'', avatar_url:'' };
    const sb = getSupabase();
    let q = sb.from('profiles').select('full_name, avatar_url').eq('user_id', userId).maybeSingle();
    let { data, error } = await q;
    if (error && (error.code === '42703' || (error.message||'').includes('avatar_url'))) {
      ({ data, error } = await sb.from('profiles').select('full_name').eq('user_id', userId).maybeSingle());
    }
    if (error) { console.warn('[auth-slot] profiles fetch', error); return { full_name:'', avatar_url:'' }; }
    return data || { full_name:'', avatar_url:'' };
  }

  function renderSignedOut(slot){
    slot.innerHTML = `
      <a class="btn" href="/auth.html">Login</a>
      <a class="btn primary" href="/auth.html#signup">Sign Up &amp; Get Listed</a>
    `;
    slot.classList.remove('hydrating');
  }

  function renderSignedIn(slot, user, profile){
    const name = profile?.full_name || user?.email || 'Account';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
    const avatar = avatarUrl
      ? `<img src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border-2,#232744)">`
      : `<div style="width:32px;height:32px;border-radius:50%;background:var(--primary,#6f75ff);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">${initials(name)}</div>`;
    
    slot.innerHTML = `
      <div class="user-menu-btn" onclick="toggleUserMenu()" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid var(--border-2,#232744);background:var(--bg-2,#1a1a1a);">
        ${avatar}
        <span style="color:var(--text-1,#eaeaea);font-size:14px;font-weight:500">${name}</span>
        <i class="fas fa-chevron-down" style="color:var(--text-2,#a0a0a0);font-size:12px"></i>
      </div>
      <div id="user-dropdown" class="user-dropdown" style="position:absolute;top:100%;right:0;background:var(--bg-1,#0f0f0f);border:1px solid var(--border-2,#232744);border-radius:8px;padding:8px 0;min-width:160px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:1000;display:none;">
        <a href="/owner.html" style="display:block;padding:8px 16px;color:var(--text-1,#eaeaea);text-decoration:none;font-size:14px;transition:background 0.2s;" onmouseover="this.style.background='var(--bg-2,#1a1a1a)'" onmouseout="this.style.background='transparent'">
          <i class="fas fa-user" style="margin-right:8px;width:16px"></i>Profile
        </a>
        <a href="/dashboard.html" style="display:block;padding:8px 16px;color:var(--text-1,#eaeaea);text-decoration:none;font-size:14px;transition:background 0.2s;" onmouseover="this.style.background='var(--bg-2,#1a1a1a)'" onmouseout="this.style.background='transparent'">
          <i class="fas fa-tachometer-alt" style="margin-right:8px;width:16px"></i>Dashboard
        </a>
        <div style="height:1px;background:var(--border-2,#232744);margin:4px 0"></div>
        <a href="#" onclick="handleLogout(); return false;" style="display:block;padding:8px 16px;color:var(--text-2,#a0a0a0);text-decoration:none;font-size:14px;transition:background 0.2s;" onmouseover="this.style.background='var(--bg-2,#1a1a1a)'" onmouseout="this.style.background='transparent'">
          <i class="fas fa-sign-out-alt" style="margin-right:8px;width:16px"></i>Logout
        </a>
      </div>
    `;
    slot.classList.remove('hydrating');
  }

  async function handleLogout(){
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('[auth-slot] logout error', error);
      alert('Logout failed. Please try again.');
    }
  }

  async function hydrateAuthSlot(){
    const slot = el('[data-auth-slot]');
    if (!slot) return;
    
    slot.classList.add('hydrating');
    
    try {
      const sb = getSupabase();
      const { data: { user }, error } = await sb.auth.getUser();
      if (error) throw error;
      
      if (user) {
        const profile = await getProfile(user.id);
        renderSignedIn(slot, user, profile);
      } else {
        renderSignedOut(slot);
      }
    } catch (error) {
      console.warn('[auth-slot] hydrate error', error);
      renderSignedOut(slot);
    }
  }

  function initHeaderAuth() {
    console.log('Initializing header auth...');
    waitForSupabase(() => {
      hydrateAuthSlot();
      
      // Listen for auth changes
      const sb = getSupabase();
      sb.auth.onAuthStateChange((event, session) => {
        console.log('[auth-slot] auth state changed:', event);
        hydrateAuthSlot();
      });
    });
  }

  // Make functions globally available
  window.initHeaderAuth = initHeaderAuth;
  window.handleLogout = handleLogout;
  window.toggleUserMenu = function() {
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) {
      userDropdown.classList.toggle('active');
    }
  };
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderAuth);
  } else {
    initHeaderAuth();
  }
})();