import { supabase } from './supabase-client.js';

async function finish() {
  try {
    // Get URL parameters to determine redirect behavior
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'signin';
    
    // Check if user is already signed in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('User already signed in:', user.email);
      redirectUser(mode);
      return;
    }
    
    // Wait for auth state change (magic link processing)
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user) {
        redirectUser(mode);
      }
    });
    
    // Fallback timeout
    setTimeout(() => {
      console.log('Auth callback timeout - redirecting to auth page');
      window.location.replace('/auth.html');
    }, 10000);
    
  } catch (error) {
    console.error('Auth callback error:', error);
    window.location.replace('/auth.html?error=callback_failed');
  }
}

function redirectUser(mode) {
  // Determine where to redirect based on mode and user state
  let redirectUrl = '/owner-activities.html'; // Default to owner activities
  
  if (mode === 'signup') {
    redirectUrl = '/owner-activities.html'; // New users go to complete their profile
  } else if (mode === 'signin') {
    redirectUrl = '/owner-activities.html'; // Existing users go to their dashboard
  }
  
  console.log(`Redirecting to: ${redirectUrl}`);
  window.location.replace(redirectUrl);
}

finish();