import { supabase } from './supabase-client.js';

export async function updateNavAuthState() {
  const { data: { user } } = await supabase.auth.getUser();
  document.querySelector('#navSignedOut')?.classList.toggle('hidden', !!user);
  document.querySelector('#navSignedIn')?.classList.toggle('hidden', !user);
}

export function initNavAuthState() {
  updateNavAuthState();
  supabase.auth.onAuthStateChange(() => updateNavAuthState());
}
