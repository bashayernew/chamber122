// Initializes Supabase in the browser if config is provided
// Include js/config.js (your credentials) before this script
// This file is a module (imported with type="module")

export let supabaseClient = null;
export let SUPABASE_ENABLED = false;

try {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (url && key) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(url, key);
    SUPABASE_ENABLED = true;
  } else {
    console.warn('Supabase config missing. Create js/config.js from js/config.sample.js');
  }
} catch (err) {
  console.warn('Supabase init failed:', err);
}

// Expose globals for non-module scripts if needed
window.SUPABASE_ENABLED = SUPABASE_ENABLED;
window.supabaseClient = supabaseClient;


