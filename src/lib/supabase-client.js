// src/lib/supabase-client.js - Use singleton from main client
import { supabase as mainSupabase } from '/js/supabase-client.js';

// Re-export the singleton client
export const supabase = mainSupabase;

export async function getUserId() {
  return (await supabase.auth.getUser()).data.user?.id ?? null;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}