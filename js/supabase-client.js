// js/supabase-client.js - Exports global Supabase client
// This file provides backward compatibility for modules that import from here

function getClient() {
  const client = window.__supabase || window.__supabaseClient || window.supabase;
  if (!client) {
    // If not available, wait a bit and try again (for async initialization)
    throw new Error('Supabase client not initialized. Make sure supabase-client.global.js is loaded first.');
  }
  return client;
}

// Export the client - modules should use it synchronously if client is ready
// For async use, they should await or use getClient() directly
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return function(...args) {
        return value.apply(client, args);
      };
    }
    return value;
  }
});

// Also set on window for backward compatibility
if (typeof window !== 'undefined') {
  // Try to set it immediately if available
  const immediateClient = window.__supabase || window.__supabaseClient;
  if (immediateClient) {
    window.supabase = immediateClient;
    window.supabaseClient = immediateClient;
  } else {
    // Otherwise wait for it
    const checkInterval = setInterval(() => {
      const client = window.__supabase || window.__supabaseClient;
      if (client) {
        window.supabase = client;
        window.supabaseClient = client;
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Clear after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}
