// Direct Supabase login handler (no imports)
console.log('[auth-login] Script loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[auth-login] DOM ready, setting up login handler');
  
  const form = document.getElementById('loginEmailForm');
  const submitBtn = document.getElementById('login-submit');
  
  if (!form) {
    console.error('[auth-login] Login form not found!');
    return;
  }
  
  if (!submitBtn) {
    console.error('[auth-login] Submit button not found!');
    return;
  }
  
  console.log('[auth-login] Form and button found, setting up Supabase client');
  
  // Create Supabase client directly
  let supabase;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    
    supabase = createClient(
      window.SUPABASE_URL || 'https://gidbvemmqffogakcepka.supabase.co',
      window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w',
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
    
    console.log('[auth-login] Supabase client created successfully');
  } catch (error) {
    console.error('[auth-login] Failed to create Supabase client:', error);
    return;
  }
  
  console.log('[auth-login] Adding event listener to form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[auth-login] Form submitted');
    
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    console.log('[auth-login] Attempting login for:', email);
    
    // Update button state
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('[auth-login] Login error:', error);
        alert(`Login failed: ${error.message}`);
        return;
      }
      
      console.log('[auth-login] Login success:', data);
      
      if (data?.session?.user) {
        console.log('[auth-login] Session created, redirecting to dashboard');
        alert(`Login successful! Redirecting to dashboard...`);
        window.location.href = '/dashboard.html';
      } else {
        console.warn('[auth-login] No session returned, may need email confirmation');
        alert('Login successful but email confirmation may be required. Please check your email.');
      }
      
    } catch (err) {
      console.error('[auth-login] Login failed:', err);
      alert(`Login failed: ${err.message || 'Unknown error'}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  console.log('[auth-login] Login handler setup complete');
});