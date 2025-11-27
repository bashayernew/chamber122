// api-config.js - Configure API base URL
// This allows setting the backend URL via Vercel environment variables or a global variable

(function() {
  'use strict';
  
  // Check for environment variable (set in Vercel)
  // Vercel exposes env vars as window.__ENV__ or we can use a meta tag
  let apiBase = '/api'; // Default to relative path
  
  // Method 1: Check for meta tag (can be set in HTML)
  const metaTag = document.querySelector('meta[name="api-base-url"]');
  if (metaTag && metaTag.content) {
    apiBase = metaTag.content;
    console.log('[api-config] Using API base from meta tag:', apiBase);
  }
  
  // Method 2: Check for global variable (can be set in HTML before scripts load)
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    apiBase = window.API_BASE_URL;
    console.log('[api-config] Using API base from window.API_BASE_URL:', apiBase);
  }
  
  // Method 3: Check for Vercel environment variable (if exposed)
  // Note: Vercel env vars starting with VITE_ or REACT_APP_ are exposed to client
  // But we need to set them in Vercel dashboard
  
  // Set global API base URL
  window.API_BASE_URL = apiBase;
  
  console.log('[api-config] API base URL configured:', apiBase);
})();

