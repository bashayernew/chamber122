// Auth guard using new API (replaces Supabase)
export async function requireAuthOrPrompt() {
  try {
    // Check if user is logged in via API
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const { user } = await response.json();
      if (user) {
        return { user }; // User is logged in
      }
    }
  } catch (error) {
    console.warn('[auth-guard] Auth check failed:', error);
  }

  // User is not logged in - show modal or redirect
  // Try different modal IDs that might exist
  const dlg = document.getElementById('login-required-modal') || 
              document.getElementById('auth-required-modal');
  
  if (dlg) {
    // Show modal if it exists
    const doLogin = () => {
      const redirect = encodeURIComponent(location.pathname + location.search);
      location.href = `/auth.html?redirect=${redirect}`;
    };
    const doCancel = () => {
      if (dlg.close) dlg.close();
      else dlg.style.display = 'none';
    };

    // Try different button IDs
    const loginBtn = document.getElementById('login-now') || 
                     document.getElementById('auth-go') ||
                     document.querySelector('[data-testid="auth-sign-in"]');
    const cancelBtn = document.getElementById('login-cancel') || 
                      document.getElementById('events-auth-cancel') ||
                      document.getElementById('bulletin-auth-cancel') ||
                      document.querySelector('[data-testid="auth-cancel"]');

    loginBtn?.addEventListener('click', doLogin, { once: true });
    cancelBtn?.addEventListener('click', doCancel, { once: true });

    // Show modal (support both dialog and div)
    if (dlg.showModal) {
      dlg.showModal();
    } else {
      dlg.style.display = 'flex';
    }
  } else {
    // No modal found - redirect directly to auth page
    const redirect = encodeURIComponent(location.pathname + location.search);
    location.href = `/auth.html?redirect=${redirect}`;
  }
  
  throw new Error('AUTH_REQUIRED');
}

