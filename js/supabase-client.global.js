// js/supabase-client.global.js - Singleton client with loader support
// No direct import here. We rely on the bootstrap loader that sets window.__supabaseMod.

const SUPABASE_URL = 'https://gidbvemmqffogakcepka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

;(async function init() {
  if (window.__supabase) {
    console.log('[supabase-client.global] already initialized, reusing');
    return;
  }
  
  // Wait for loader with timeout
  if (!window.__supabaseReady) {
    const maxWait = 5000; // 5 seconds max
    const start = Date.now();
    await new Promise(r => {
      const i = setInterval(() => {
        if ((window.__supabaseReady && window.__supabaseMod) || (Date.now() - start) > maxWait) {
          clearInterval(i);
          r();
        }
      }, 25);
    });
  }
  
  const { createClient } = window.__supabaseMod || {};
  if (!createClient) {
    console.error('[supabase-client.global] missing createClient export');
    return;
  }
  
  console.log('[supabase-client.global] initialized once');
  window.__supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  
  // Also set the export for modules that import this
  window.__supabaseClient = window.__supabase;
})();

export const supabase = window.__supabase || window.__supabaseClient;
