// Shared helpers to make sure a session is loaded/restored on every page.
import { supabase } from './supabase-client.js';

function projectRef() {
  try { return new URL(window.SUPABASE_URL).host.split('.')[0]; }
  catch { return null; }
}

function storageKey() {
  const ref = projectRef();
  return ref ? `sb-${ref}-auth-token` : null;
}

/** Ensure the Supabase client is using the latest session from localStorage.
 *  Returns the active session or null.
 */
export async function ensureSessionHydrated() {
  console.log('[auth-session] Starting session hydration...');
  
  try {
    // First, try to get the current session
    const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[auth-session] Error getting current session:', sessionError);
    }
    
    if (currentSession?.session?.user) {
      console.log('[auth-session] Session found in client:', currentSession.session.user.email);
      return currentSession.session;
    }
    
    console.log('[auth-session] No session in client, checking localStorage...');
    
    // Check all possible localStorage keys for Supabase
    const possibleKeys = Object.keys(localStorage).filter(key => 
      key.includes('sb-') && key.includes('auth-token')
    );
    
    console.log('[auth-session] Found localStorage keys:', possibleKeys);
    
    for (const key of possibleKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        
        const parsed = JSON.parse(raw);
        console.log('[auth-session] Checking key:', key);
        
        const session = parsed?.currentSession;
        if (session?.access_token && session?.refresh_token) {
          console.log('[auth-session] Attempting to restore session from:', key);
          
          const { data: restoredSession, error: restoreError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
          
          if (restoreError) {
            console.warn('[auth-session] Failed to restore session from', key, ':', restoreError);
            continue;
          }
          
          if (restoredSession?.session?.user) {
            console.log('[auth-session] Successfully restored session for:', restoredSession.session.user.email);
            return restoredSession.session;
          }
        }
      } catch (e) {
        console.warn('[auth-session] Error processing key', key, ':', e);
      }
    }
    
    console.log('[auth-session] No valid session found in localStorage');
    return null;
    
  } catch (e) {
    console.error('[auth-session] Critical error in session hydration:', e);
    return null;
  }
}

export function onAnyAuthChange(cb) {
  console.log('[auth-session] Setting up auth state change listener...');
  
  return supabase.auth.onAuthStateChange((evt, session) => {
    console.log('[auth-session] Auth state changed:', evt, session ? `User: ${session.user?.email}` : 'No session');
    
    if (['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(evt)) {
      cb(evt, session || null);
    }
  });
}

// Debug function to check session state
export async function debugSessionState() {
  console.log('=== SESSION DEBUG ===');
  
  // Check current session
  const { data: currentSession } = await supabase.auth.getSession();
  console.log('Current session:', currentSession?.session ? `User: ${currentSession.session.user?.email}` : 'None');
  
  // Check localStorage
  const keys = Object.keys(localStorage).filter(k => k.includes('sb-'));
  console.log('LocalStorage keys:', keys);
  
  keys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`Key ${key}:`, data);
    } catch (e) {
      console.log(`Key ${key}: Invalid JSON`);
    }
  });
  
  console.log('=== END DEBUG ===');
}

// Make debug function available globally
window.debugSessionState = debugSessionState;
