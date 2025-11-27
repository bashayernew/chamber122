// Global refresh system for Events & Bulletins displays
import { loadPublicEvents } from './events-public.js';
import { loadPublicBulletins } from './bulletins-public.js';
import { loadOwnerEventsAndBulletins } from './profile-events.js';
import { renderList, eventCard, bulletinCard } from './ui-cards.js';

// Global refresh function that can be called from anywhere
window.refreshEventsAndBulletins = async function() {
  console.log('[refresh] Refreshing Events & Bulletins displays...');
  
  // Refresh home page displays
  const eO = document.getElementById('events-ongoing');
  const eU = document.getElementById('events-upcoming');
  const eP = document.getElementById('events-previous');
  const bC = document.getElementById('bulletins-current');
  const bR = document.getElementById('bulletins-recent');

  if (eO || eU || eP || bC || bR) {
    console.log('[refresh] Refreshing public displays...');
    const ev = await loadPublicEvents(12);
    const bu = await loadPublicBulletins(12);
    
    if (eO) renderList(eO, ev.ongoing, eventCard, 'No ongoing events.');
    if (eU) renderList(eU, ev.upcoming, eventCard, 'No upcoming events.');
    if (eP) renderList(eP, ev.previous, eventCard, 'No previous events.');
    if (bC) renderList(bC, bu.current, bulletinCard, 'No current bulletins.');
    if (bR) renderList(bR, bu.recent, bulletinCard, 'No recent bulletins.');
  }

  // Refresh owner profile displays
  const ownerSections = document.querySelectorAll('#ev-ongoing, #ev-upcoming, #ev-previous, #ev-pending, #bl-current, #bl-recent, #bl-pending');
  if (ownerSections.length > 0) {
    console.log('[refresh] Refreshing owner profile displays...');
    
    try {
      // Get owner ID from current user's business using new API
      const { getCurrentUser, getMyBusiness } = await import('/js/api.js');
      const user = await getCurrentUser();
      if (user) {
        const business = await getMyBusiness();
        
        if (business?.id) {
          // Always show all events/bulletins (including drafts) when refreshing owner's own profile
          const data = await loadOwnerEventsAndBulletins(business.id, true);
          
          renderList(document.getElementById('ev-ongoing'),  data.events.ongoing,  eventCard, 'No ongoing events.');
          renderList(document.getElementById('ev-upcoming'), data.events.upcoming, eventCard, 'No upcoming events.');
          renderList(document.getElementById('ev-previous'), data.events.previous, eventCard, 'No previous events.');
          renderList(document.getElementById('ev-pending'),  data.events.pending,  eventCard, 'No pending events.');
          
          renderList(document.getElementById('bl-current'), data.bulletins.current, bulletinCard, 'No current bulletins.');
          renderList(document.getElementById('bl-recent'),  data.bulletins.recent,  bulletinCard, 'No recent bulletins.');
          renderList(document.getElementById('bl-pending'),  data.bulletins.pending,  bulletinCard, 'No pending bulletins.');
        }
      }
    } catch (error) {
      console.error('[refresh] Error refreshing owner profile displays:', error);
    }
  }
  
  console.log('[refresh] Refresh complete!');
};

// Auto-refresh every 60 seconds (reduced frequency to prevent spam)
let refreshInterval = null;
if (typeof window !== 'undefined') {
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      window.refreshEventsAndBulletins();
    }
  }, 60000); // 60 seconds instead of 30
}

console.log('[refresh] Events & Bulletins refresh system loaded');
