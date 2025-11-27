// js/auth-signup-utils.js - Auth utilities using localStorage only (no backend, no API)
import { signup, login, getCurrentUser, logout } from './auth-localstorage.js';

export function assertCreds(email, password) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Valid email is required');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
}

export async function signupWithEmailPassword(email, password, businessData = {}) {
  assertCreds(email, password);
  
  try {
    const result = signup(email, password, businessData);
    // No email confirmation needed with localStorage
    return { requiresConfirm: false, user: result.user };
  } catch (error) {
    // Handle duplicate account
    if (error.message && error.message.includes('already exists')) {
      throw new Error('ACCOUNT_EXISTS');
    }
    throw error;
  }
}

export async function signInWithPassword(email, password) {
  assertCreds(email, password);
  try {
    const result = login(email, password);
    return { user: result.user };
  } catch (error) {
    throw error;
  }
}

export async function resendConfirmation(email) {
  // Not needed with localStorage - users are immediately active
  console.log('[auth] resendConfirmation called but not needed with localStorage');
  return { success: true };
}

export async function requireSession() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}
