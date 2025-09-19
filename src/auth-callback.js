import { supabase } from './lib/supabase-client.js';

async function finish() {
  try {
    // If tokens are in the URL, supabase-js processes them automatically
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      showError('Authentication failed. Please try again.');
      setTimeout(() => window.location.replace('/auth.html'), 3000);
      return;
    }
    
    if (user) {
      console.log('User authenticated:', user.email);
      // Redirect to owner activities page (or dashboard)
      window.location.replace('/owner-activities.html');
      return;
    }
    
    // Wait for auth state change if user not immediately available
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user) {
        window.location.replace('/owner-activities.html');
      } else if (event === 'SIGNED_OUT') {
        window.location.replace('/auth.html');
      }
    });
    
    // Fallback: redirect to auth page after 4 seconds if no user
    setTimeout(() => {
      if (!user) {
        window.location.replace('/auth.html');
      }
    }, 4000);
    
  } catch (error) {
    console.error('Callback error:', error);
    showError('An unexpected error occurred. Please try again.');
    setTimeout(() => window.location.replace('/auth.html'), 3000);
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Start the authentication process
finish();
