// Auth API - Using new backend API instead of Supabase
import { signup, login, logout } from './api.js';
import { isEmailConfirmationBypassed } from './auth-dev.js';

// Check if account exists (email or phone)
export async function rpcAccountExists(email, phone) {
  // For now, we'll check via the signup endpoint
  // In a real implementation, you'd have a dedicated endpoint
  return { email_exists: false, phone_exists: false };
}

// Ensure profile exists (not needed with new backend, but kept for compatibility)
export async function ensureProfile({ email=null, phone=null } = {}) {
  // Profile is handled automatically by the backend
  return;
}

export async function signupWithEmailPassword({ email, password, phone }) {
  if (!email) throw new Error('Email is required');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

  try {
    const result = await signup(email, password, { phone: phone || null });
    return { 
      requiresConfirm: false, // New backend doesn't require email confirmation
      user: result.user 
    };
  } catch (error) {
    // Map common errors
    if (error.message?.includes('already exists') || error.message?.includes('User already exists')) {
      throw new Error('An account already exists with this email. Please log in.');
    }
    throw error;
  }
}

const DASHBOARD_URL = '/owner-bulletins.html';

function normEmail(e){ return (e||'').trim().toLowerCase(); }
function mapAuthError(err){
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid_grant') || msg.includes('invalid email or password')) return 'Email or password is incorrect.';
  if (msg.includes('not confirmed')) return 'Please confirm your email before logging in.';
  if (msg.includes('rate')) return 'Too many attempts. Try again in a few minutes.';
  return err?.message || 'Login failed. Please try again.';
}

export async function loginWithEmailPassword(email, password, { redirectTo = DASHBOARD_URL } = {}) {
  const e = normEmail(email), p = (password||'').trim();
  if (!e || !p) throw new Error('Please enter email and password.');

  try {
    await login(e, p);
    const url = new URL(redirectTo, location.origin);
    window.location.href = url.href; // hard redirect avoids SPA race conditions
  } catch (err) {
    throw new Error(mapAuthError(err));
  }
}

export async function sendPasswordReset(email) {
  if (!email) throw new Error('Enter a valid email');
  email = email.toLowerCase().trim();
  
  // TODO: Implement password reset endpoint
  throw new Error('Password reset not yet implemented. Please contact support.');
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Enter a valid email');
  email = email.toLowerCase().trim();
  
  // New backend doesn't require email confirmation
  return 'Email confirmation is not required. You can log in directly.';
}

export async function sendEmailMagicLink(email) {
  if (!email) throw new Error('Enter a valid email');
  // TODO: Implement magic link endpoint
  throw new Error('Magic link login not yet implemented. Please use email/password.');
}

export async function sendPhoneOtp(phone) {
  if (!phone) throw new Error('Enter a valid phone');
  // TODO: Implement phone OTP endpoint
  throw new Error('Phone OTP login not yet implemented. Please use email/password.');
}

export async function verifyPhoneOtp({ phone, code }) {
  if (!phone || !code) throw new Error('Phone and code required');
  // TODO: Implement phone OTP verification endpoint
  throw new Error('Phone OTP verification not yet implemented. Please use email/password.');
}

export async function signOut() {
  await logout();
}

// Development function to clear session and start fresh
export async function devClearSession() {
  try {
    await logout();
    console.log('DEV: Session cleared');
  } catch (error) {
    console.error('DEV: Error clearing session:', error);
  }
}
