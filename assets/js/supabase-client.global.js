// Global Supabase Client - ES Module
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Get Supabase configuration
const SUPABASE_URL = window.SUPABASE_URL || 
  document.querySelector('meta[name="supabase-url"]')?.content ||
  'https://gidbvemmqffogakcepka.supabase.co';

const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 
  document.querySelector('meta[name="supabase-anon-key"]')?.content ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Also set global for backward compatibility
window.supabase = supabase;
window.supabaseClient = supabase;
window.supa = supabase;
window.sb = supabase;

console.log('[supabase-client.global.js] Supabase client initialized');
