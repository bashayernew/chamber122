// Use this ONLY on pages that must be authenticated (e.g., dashboard.html)
import { supabase } from './supabase-client.js';

async function guard(){
  const { data } = await supabase.auth.getSession();
  const authed = Boolean(data?.session?.user);
  if (!authed) location.href = '/auth.html';
}
guard();

// If the user signs out from another tab, bounce away
supabase.auth.onAuthStateChange((_evt, session) => {
  if (!session?.user) location.href = '/auth.html';
});
