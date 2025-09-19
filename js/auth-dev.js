/**
 * Development Authentication Module
 * Bypasses email confirmation for development testing
 * 
 * TODO: Re-enable email confirmation in production
 * To re-enable: Set BYPASS_EMAIL_CONFIRMATION = false in config-dev.js
 */

import { supabase } from './supabase-client.js';
import { DEV_CONFIG } from './config-dev.js';

/**
 * Development signup that bypasses email confirmation
 */
export async function devSignup(email, password) {
  if (!DEV_CONFIG.BYPASS_EMAIL_CONFIRMATION) {
    // Production mode - use normal signup
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { requiresConfirm: !data.session, user: data.user };
  }

  // Development mode - bypass email confirmation
  console.log('DEV: Signing up with email confirmation bypass...');
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  
  if (!data.user) {
    throw new Error('User creation failed');
  }

  // Immediately sign in the user to bypass email confirmation
  const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });
  
  if (signinError) {
    console.error('DEV: Auto signin failed:', signinError);
    throw new Error('Signup successful but auto-login failed. Please try logging in manually.');
  }

  console.log('DEV: User signed up and auto-logged in successfully');
  return { requiresConfirm: false, user: signinData.user };
}

/**
 * Development login that bypasses email confirmation checks
 */
export async function devLogin(email, password) {
  if (!DEV_CONFIG.BYPASS_EMAIL_CONFIRMATION) {
    // Production mode - use normal login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  // Development mode - bypass email confirmation
  console.log('DEV: Logging in with email confirmation bypass...');
  
  try {
    // First, try to sign up the user (this will work even if they exist)
    console.log('DEV: Attempting signup first...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    
    if (signupError) {
      console.log('DEV: Signup failed (user might exist):', signupError.message);
    } else {
      console.log('DEV: Signup successful or user already exists');
    }
    
    // Now try to sign in
    console.log('DEV: Attempting signin...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('DEV: Signin failed:', error);
      
      // If signin fails, try a different approach - check if user exists and create session manually
      console.log('DEV: Trying alternative approach...');
      
      // Get current user to see if we're already signed in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        console.log('DEV: User already signed in');
        return currentUser;
      }
      
      throw new Error('Login failed: ' + error.message);
    }
    
    console.log('DEV: Login successful');
    return data.user;
    
  } catch (error) {
    console.error('DEV: Login error:', error);
    throw error;
  }
}

/**
 * Check if email confirmation is bypassed
 */
export function isEmailConfirmationBypassed() {
  return DEV_CONFIG.BYPASS_EMAIL_CONFIRMATION;
}

/**
 * Test Supabase connectivity
 */
export async function testSupabaseConnection() {
  try {
    console.log('DEV: Testing Supabase connection...');
    const { data, error } = await supabase.auth.getUser();
    console.log('DEV: Supabase connection test result:', { data, error });
    return !error;
  } catch (error) {
    console.error('DEV: Supabase connection test failed:', error);
    return false;
  }
}
