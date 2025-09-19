import { supabase } from './supabase-client.js';

export function assertCreds(email, password) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Valid email is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
}

export async function signupWithEmailPassword(email, password) {
  assertCreds(email, password);
  
  // Use current origin for redirect (works on both 8000 and 3000)
  const emailRedirectTo = `${window.location.origin}/auth-callback.html?mode=signup`;
  
  const { data, error } = await supabase.auth.signUp({
    email, 
    password,
    options: { 
      emailRedirectTo,
      data: {
        full_name: email.split('@')[0] // Default name from email
      }
    },
  });
  
  if (error) throw error;
  
  return { 
    requiresConfirm: !data.session, // true if confirm-email is ON
    user: data.user 
  };
}

export async function signInWithPassword(email, password) {
  assertCreds(email, password);
  
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });
  
  if (error) throw error;
  
  return data;
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Email missing');
  
  const { error } = await supabase.auth.resend({ 
    type: 'signup', 
    email 
  });
  
  if (error) throw error;
}

export async function requireSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Please sign in first.');
  }
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}