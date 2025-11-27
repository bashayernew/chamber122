// auth-state-manager.js - Using backend API instead of Supabase
import { getCurrentUser as apiGetCurrentUser } from './api.js';

let currentUser = null;
let initialized = false;

/** Initialize auth state manager */
export async function initAuthState() {
  if (initialized) return;
  initialized = true;

  // Fetch current user from backend
  try {
    currentUser = await apiGetCurrentUser();
  } catch (err) {
    currentUser = null;
  }
}

/** Returns the latest known user (might be null) */
export function getCurrentUser() {
  return currentUser;
}