import { supabase } from "./supabase-client.js";

let currentUser = null;
let initialized = false;

/** Initialize Supabase auth listeners once */
export function initAuthState() {
  if (initialized) return;
  initialized = true;

  // initial fetch
  supabase.auth.getUser().then(({ data: { user } }) => { currentUser = user ?? null; });

  // subscribe to changes
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
  });
}

/** Returns the latest known user (might be null) */
export function getCurrentUser() {
  return currentUser;
}