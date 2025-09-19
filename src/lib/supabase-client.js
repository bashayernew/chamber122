import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from meta tags or environment
const url = document.querySelector('meta[name="supabase-url"]')?.content || 
  import.meta?.env?.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const anon = document.querySelector('meta[name="supabase-anon"]')?.content ||
  import.meta?.env?.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Missing Supabase configuration. Please check meta tags or environment variables.');
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // IMPORTANT for magic-link callback
  },
});

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