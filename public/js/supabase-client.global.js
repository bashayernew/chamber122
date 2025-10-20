// public/js/supabase-client.global.js v=3 (ESM ONLY - Singleton)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---- CONFIG ----
const SUPABASE_URL = 'https://gidbvemmqffogakcepka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

// Fail fast if placeholders not replaced
if (SUPABASE_URL.includes('<YOUR-PROJECT-REF>') || SUPABASE_ANON_KEY.includes('<YOUR-ANON-KEY>')) {
  console.error('[supabase-client.global] Missing Supabase URL/Anon Key. Replace placeholders.');
  throw new Error('Supabase configuration missing');
}

// Create exactly once (singleton pattern)
if (!window.__supabaseClient) {
  window.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  console.log('[supabase-client.global] initialized once');
} else {
  console.log('[supabase-client.global] already initialized, reusing');
}

export const supabase = window.__supabaseClient;
