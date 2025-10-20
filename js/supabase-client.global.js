// Global Supabase Client - Classic Script
// This file sets up the global Supabase client for classic scripts

(function() {
  'use strict';
  
  // Check if already loaded
  if (window.__supabase_global_loaded__) return;
  window.__supabase_global_loaded__ = true;
  
  // Get Supabase configuration
  const SUPABASE_URL = window.SUPABASE_URL || 
    document.querySelector('meta[name="supabase-url"]')?.content ||
    'https://gidbvemmqffogakcepka.supabase.co';

  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 
    document.querySelector('meta[name="supabase-anon-key"]')?.content ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

  // Create and export the Supabase client
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = supabase;
  
  // Also set legacy globals for backward compatibility
  window.supabaseClient = supabase;
  window.supa = supabase;
  window.sb = supabase;
  
  console.log('[supabase-client.global.js] Supabase client initialized');
  
  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('supabaseReady'));
})();