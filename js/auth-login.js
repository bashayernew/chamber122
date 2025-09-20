// Bulletproof login handler
import { supabase } from './supabase-client.js';

console.log('[auth-login] Script loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
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
  
  console.log('[auth-login] Form and button found, adding event listener');
  
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
        throw error;
      }
      
      console.log('[auth-login] Login success:', data);
      
      if (data?.session?.user) {
        console.log('[auth-login] Session created, redirecting to dashboard');
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