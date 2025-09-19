import { supabase } from './supabase-client.js';

export async function updateNavAuthState() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return;
    }
    
    // Update auth CTA visibility
    const authCta = document.querySelector('#auth-cta');
    const accountMenu = document.querySelector('#account-menu');
    
    if (authCta && accountMenu) {
      if (user) {
        // User is signed in
        authCta.style.display = 'none';
        accountMenu.classList.remove('hidden');
        
        // Update account name and avatar
        const accountName = document.querySelector('#account-name');
        const accountAvatar = document.querySelector('#account-avatar');
        
        if (accountName) {
          accountName.textContent = user.user_metadata?.full_name || user.email || 'Account';
        }
        
        if (accountAvatar && user.user_metadata?.avatar_url) {
          accountAvatar.src = user.user_metadata.avatar_url;
          accountAvatar.classList.remove('hidden');
        }
      } else {
        // User is signed out
        authCta.style.display = 'flex';
        accountMenu.classList.add('hidden');
      }
    }
    
    // Update mobile menu auth state
    const mobileAuthLinks = document.querySelectorAll('.mobile-menu a[href*="auth.html"]');
    const mobileAccountLinks = document.querySelectorAll('.mobile-menu a[href*="owner"]');
    
    mobileAuthLinks.forEach(link => {
      link.style.display = user ? 'none' : 'block';
    });
    
    mobileAccountLinks.forEach(link => {
      link.style.display = user ? 'block' : 'none';
    });
    
  } catch (error) {
    console.error('Error updating nav auth state:', error);
  }
}

export function initNavAuthState() {
  // Initial state update
  updateNavAuthState();
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    updateNavAuthState();
  });
}

export function setupLogoutHandler() {
  const logoutBtn = document.querySelector('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await supabase.auth.signOut();
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
        alert('Error signing out. Please try again.');
      }
    });
  }
}
