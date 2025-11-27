// assets/js/profile-events.js - Load events and bulletins for owner profile using localStorage
import { getCurrentUser } from '/js/auth-localstorage.js';
import { getPublicEvents, getPublicBulletins } from '/js/api.js';

export async function loadOwnerEventsAndBulletins(ownerId, isOwnerViewingOwnProfile = false) {
    const now = new Date().toISOString();

    try {
      // Load events by business_id
      let ownerEvents = [];
      
      // Load events from localStorage
      try {
        if (isOwnerViewingOwnProfile) {
          // Owner viewing own profile: Load ALL events (including drafts) directly from localStorage
          const stored = localStorage.getItem('chamber122_events');
          const allEvents = stored ? JSON.parse(stored) : [];
          // Filter events by business_id (ownerId is the business ID)
          ownerEvents = allEvents.filter(e => {
            // Check if event belongs to this business
            return e.business_id === ownerId || e.owner_id === ownerId;
          });
        } else {
          // Non-owner viewing: Only load published events
          const allEvents = await getPublicEvents();
          // Filter events by business_id (ownerId is the business ID)
          ownerEvents = allEvents.filter(e => {
            // Check if event belongs to this business
            return e.business_id === ownerId || e.owner_id === ownerId;
          });
        }
      } catch (err) {
        console.error('[profile-events] Error loading events:', err);
        ownerEvents = [];
      }

      // Categorize events by time
      // If owner viewing own profile, include drafts in all categories
      const ongoing = ownerEvents.filter(e => {
        // If owner viewing own profile and event is draft, include it
        if (isOwnerViewingOwnProfile && (e.status === 'draft' || !e.is_published || !e.status)) {
          return true;
        }
        if (!e.start_at || !e.end_at) return false;
        return e.start_at <= now && e.end_at >= now;
      });
      
      const upcoming = ownerEvents.filter(e => {
        // If owner viewing own profile and event is draft, include it
        if (isOwnerViewingOwnProfile && (e.status === 'draft' || !e.is_published || !e.status)) {
          return true;
        }
        if (!e.start_at) return true;
        return e.start_at > now;
      });
      
      const previous = ownerEvents.filter(e => {
        // If owner viewing own profile and event is draft, include it
        if (isOwnerViewingOwnProfile && (e.status === 'draft' || !e.is_published || !e.status)) {
          return true;
        }
        if (!e.end_at) return false;
        return e.end_at < now;
      });

      // Load bulletins by business_id
      let pubs = [];
      
      // Load bulletins from localStorage
      try {
        if (isOwnerViewingOwnProfile) {
          // Owner viewing own profile: Load ALL bulletins (including drafts) directly from localStorage
          const stored = localStorage.getItem('chamber122_bulletins');
          let allBulletins = [];
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              allBulletins = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
            } catch (e) {
              console.warn('[profile-events] Error parsing bulletins:', e);
              allBulletins = [];
            }
          }
          // Filter bulletins by business_id (ownerId is the business ID)
          pubs = allBulletins.filter(b => {
            // Check if bulletin belongs to this business
            return b.business_id === ownerId || b.owner_id === ownerId;
          });
        } else {
          // Non-owner viewing: Only load published bulletins
          const allBulletins = await getPublicBulletins();
          // Filter bulletins by business_id (ownerId is the business ID)
          pubs = allBulletins.filter(b => {
            // Check if bulletin belongs to this business
            return b.business_id === ownerId || b.owner_id === ownerId;
          });
        }
      } catch (err) {
        console.error('[profile-events] Error loading bulletins:', err);
        pubs = [];
      }

      // Support both start_at/end_at and start_date/deadline_date field variants
      const getStart = (b) => b.start_at || b.start_date || b.publish_at || null;
      const getEnd = (b) => b.end_at || b.deadline_date || b.end_date || b.expire_at || null;

      const bulletinsArray = Array.isArray(pubs) ? pubs : [];
      
      // If owner viewing own profile, include drafts in all categories
      // Otherwise, categorize by date
      const b_ongoing = bulletinsArray.filter(b => {
        // If owner viewing own profile and bulletin is draft, include it
        if (isOwnerViewingOwnProfile && (b.status === 'draft' || !b.is_published || !b.status)) {
          return true;
        }
        const s = getStart(b);
        const e = getEnd(b);
        if (!s && !e) return true;
        if (s && e) return s <= now && e >= now;
        if (s && !e) return s <= now;
        if (!s && e) return e >= now;
        return false;
      });
      
      const b_upcoming = bulletinsArray.filter(b => {
        // If owner viewing own profile and bulletin is draft, include it
        if (isOwnerViewingOwnProfile && (b.status === 'draft' || !b.is_published || !b.status)) {
          return true;
        }
        const s = getStart(b);
        return s && s > now;
      });
      
      const b_previous = bulletinsArray.filter(b => {
        // If owner viewing own profile and bulletin is draft, include it
        if (isOwnerViewingOwnProfile && (b.status === 'draft' || !b.is_published || !b.status)) {
          return true;
        }
        const e = getEnd(b);
        return e && e < now;
      });

      return {
        events: { ongoing, upcoming, previous, error: null },
        bulletins: { ongoing: b_ongoing, upcoming: b_upcoming, previous: b_previous, error: null }
      };
    } catch (error) {
      console.error('[profile-events] Error loading events/bulletins:', error);
      return {
        events: { ongoing: [], upcoming: [], previous: [], error },
        bulletins: { ongoing: [], upcoming: [], previous: [], error }
      };
    }
  }

// Make function available globally
window.loadOwnerEventsAndBulletins = loadOwnerEventsAndBulletins;
