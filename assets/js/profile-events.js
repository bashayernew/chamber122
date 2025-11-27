// assets/js/profile-events.js - Load events and bulletins for owner profile using backend API
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('session_token');
  
  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const res = await fetch(url, config);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export async function loadOwnerEventsAndBulletins(ownerId, isOwnerViewingOwnProfile = false) {
    const now = new Date().toISOString();

    try {
      // Load events by business_id
      let ownerEvents = [];
      
      if (isOwnerViewingOwnProfile) {
        // Owner viewing own profile - get all events (including drafts) from dashboard
        try {
          const eventsResponse = await apiRequest(`/dashboard/my-events`);
          ownerEvents = eventsResponse.events || [];
        } catch (err) {
          console.error('[profile-events] Error loading my events:', err);
          ownerEvents = [];
        }
      } else {
        // Public view - only published events, filter by business_id
        try {
          const eventsResponse = await apiRequest(`/events`);
          const allEvents = eventsResponse.events || [];
          ownerEvents = allEvents.filter(e => e.business_id === ownerId);
        } catch (err) {
          console.error('[profile-events] Error loading public events:', err);
          ownerEvents = [];
        }
      }

      // Categorize events by time
      const ongoing = ownerEvents.filter(e => {
        if (!e.start_at || !e.end_at) return false;
        return e.start_at <= now && e.end_at >= now;
      });
      
      const upcoming = ownerEvents.filter(e => {
        if (!e.start_at) return true;
        return e.start_at > now;
      });
      
      const previous = ownerEvents.filter(e => {
        if (!e.end_at) return false;
        return e.end_at < now;
      });

      // Load bulletins by business_id
      let pubs = [];
      
      if (isOwnerViewingOwnProfile) {
        // Owner viewing own profile - get all bulletins (including drafts) from dashboard
        try {
          const bulletinsResponse = await apiRequest(`/dashboard/my-bulletins`);
          pubs = bulletinsResponse.bulletins || [];
        } catch (err) {
          console.error('[profile-events] Error loading my bulletins:', err);
          pubs = [];
        }
      } else {
        // Public view - only published bulletins, filter by business_id
        try {
          const bulletinsResponse = await apiRequest(`/bulletins`);
          const allBulletins = bulletinsResponse.bulletins || [];
          pubs = allBulletins.filter(b => b.business_id === ownerId);
        } catch (err) {
          console.error('[profile-events] Error loading public bulletins:', err);
          pubs = [];
        }
      }

      // Support both start_at/end_at and start_date/deadline_date field variants
      const getStart = (b) => b.start_at || b.start_date || b.publish_at || null;
      const getEnd = (b) => b.end_at || b.deadline_date || b.end_date || b.expire_at || null;

      const bulletinsArray = Array.isArray(pubs) ? pubs : [];
      
      const b_ongoing = bulletinsArray.filter(b => {
        const s = getStart(b);
        const e = getEnd(b);
        if (!s && !e) return true;
        if (s && e) return s <= now && e >= now;
        if (s && !e) return s <= now;
        if (!s && e) return e >= now;
        return false;
      });
      
      const b_upcoming = bulletinsArray.filter(b => {
        const s = getStart(b);
        return s && s > now;
      });
      
      const b_previous = bulletinsArray.filter(b => {
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
