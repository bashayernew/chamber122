import { supabase } from './supabase-client.js';

export function assertCreds(email, password) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Valid email is required');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
}

export async function signupWithEmailPassword(email, password) {
  assertCreds(email, password);
  const emailRedirectTo = `${window.location.origin}/auth-callback.html?mode=signup`;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) throw error;
  return { requiresConfirm: !data.session };
}

export async function signInWithPassword(email, password) {
  assertCreds(email, password);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Email missing');
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function requireSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Please sign in first.');
  return data.user;
}