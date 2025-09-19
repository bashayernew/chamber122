/**
 * Page Auth Setup
 * Adds authentication state management to any page
 * Include this script on pages that need auth state
 */

// Add the auth scripts to the page if they're not already present
function addAuthScripts() {
  const scripts = [
    'js/config.js',
    'js/supabase-client.js', 
    'js/auth-state-manager.js',
    'js/reactive-header.js'
  ];

  scripts.forEach(src => {
    // Check if script already exists
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      document.head.appendChild(script);
    }
  });
}

// Add scripts when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addAuthScripts);
} else {
  addAuthScripts();
}
