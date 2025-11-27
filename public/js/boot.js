// boot.js v=3 - Single module entry point (Supabase removed)
import '/js/api.js';  // Backend API helper
import './header-auth-slot.js';

const page = document.body?.dataset?.page || '';
console.log('[boot] Initializing page:', page);
console.log('[boot] Document body:', document.body);
console.log('[boot] Body dataset:', document.body?.dataset);

switch (page) {
  case 'auth':
    console.log('[boot] Auth page - login handler loaded separately');
    break;

  case 'owner':
    // Owner page: skip module loading, uses classic scripts
    console.log('[boot] Owner page - using classic scripts');
    break;

  case 'directory':
    // Directory page: main.js has msmeData
    await import('./main.js?v=7');
    break;

  case 'events':
    await import('./auth-guard.js');
    await import('./api.js');
    await import('./events.page.js');
    if (new URLSearchParams(location.search).get('dev') === '1') {
      await import('./storage-selftest.js?v=1');
    }
    break;

  case 'dashboard':
    // Dashboard needs activities list
    await import('./api.js');
    await import('./dashboard-owner.page.js');
    break;

  case 'profile':
    // Profile page
    console.log('[boot] Loading profile modules...');
    await import('./api.js?v=2');
    await import('./profile.page.js?v=2');
    await import('./owner.gallery.js');
    console.log('[boot] Profile modules loaded');
    break;

  case 'bulletins':
    await import('./fetch.js');
    await import('./bulletins.page.js');
    break;

  default:
    console.log('[boot] Default page - minimal modules');
    break;
}

console.log('[boot] Page initialization complete');
