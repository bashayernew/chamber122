// Require Auth - Redirect to login if not signed in
(function() {
  'use strict';
  
  // Run once guard
  if (window.__requireAuth_loaded__) return;
  window.__requireAuth_loaded__ = true;
  
  async function checkAuth() {
    const supa = window.supabase;
    if (!supa) {
      console.error('[require-auth] Supabase client not available');
      return;
    }
    
    try {
      const { data: { session } } = await supa.auth.getSession();
      if (!session?.user) {
        const next = encodeURIComponent(location.pathname + location.search);
        console.log('[require-auth] No session, redirecting to login');
        location.href = `/auth.html?next=${next}`;
      } else {
        console.log('[require-auth] User authenticated:', session.user.email);
      }
    } catch (error) {
      console.error('[require-auth] Auth check failed:', error);
      // Don't redirect on error, just log it
    }
  }
  
  // Check auth when script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();