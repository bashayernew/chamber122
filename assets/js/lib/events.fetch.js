// /assets/js/lib/events.fetch.js - Using backend API instead of Supabase

/**
 * Unified events fetch function with proper API handling
 * @param {Object} options - Fetch options
 * @param {string} options.scope - 'public' or 'owner'
 * @param {string} options.kind - Event kind filter ('all' for no filter)
 * @param {boolean} options.upcomingOnly - Whether to filter for upcoming events only
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchEvents({ scope = 'public', kind = 'all', upcomingOnly = true } = {}) {
  try {
    console.debug(`[events] loading scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}`);
    
    // Use backend API
    const res = await fetch('/api/events');
    
    let events = [];
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('[events] API endpoint not available (404), using localStorage fallback');
        // Try localStorage fallback
        try {
          const stored = localStorage.getItem('chamber122_events');
          if (stored) {
            events = JSON.parse(stored);
            console.log(`[events] Loaded ${events.length} events from localStorage`);
          }
        } catch (e) {
          console.warn('[events] Error reading from localStorage:', e);
        }
        // Continue with empty array or localStorage data
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } else {
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await res.json();
      if (data.ok && data.events) {
        events = data.events;
        // Store in localStorage for fallback
        try {
          localStorage.setItem('chamber122_events', JSON.stringify(events));
        } catch (e) {
          console.warn('[events] Could not store in localStorage:', e);
        }
      }
    }
    
    if (!events || events.length === 0) {
      return { data: [], error: null };
    }
    
    // Filter by kind if needed
    let filtered = events || [];
    if (kind && kind !== 'all') {
      filtered = filtered.filter(e => e.kind === kind);
    }
    
    // Filter upcoming only if needed
    if (upcomingOnly) {
      const now = new Date().toISOString();
      filtered = filtered.filter(e => e.start_at && e.start_at >= now);
    }
    
    console.debug(`[events] loaded ${filtered.length} events`);
    return { data: filtered, error: null };
  } catch (err) {
    console.error('[events] unexpected error:', err);
    return { data: [], error: err };
  }
}

/**
 * Fetch events with business information (for public display)
 * @param {Object} options - Fetch options
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchEventsWithBusiness({ scope = 'public', kind = 'all', upcomingOnly = false, limit = null } = {}) {
  try {
    console.debug(`[events] loading with business info scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}, limit=${limit}`);
    
    // Use backend API
    const res = await fetch('/api/events');
    
    let events = [];
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('[events] API endpoint not available (404), using localStorage fallback');
        // Try localStorage fallback
        try {
          const stored = localStorage.getItem('chamber122_events');
          if (stored) {
            events = JSON.parse(stored);
            console.log(`[events] Loaded ${events.length} events from localStorage`);
          }
        } catch (e) {
          console.warn('[events] Error reading from localStorage:', e);
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } else {
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await res.json();
      if (data.ok && data.events) {
        events = data.events;
        // Store in localStorage for fallback
        try {
          localStorage.setItem('chamber122_events', JSON.stringify(events));
        } catch (e) {
          console.warn('[events] Could not store in localStorage:', e);
        }
      }
    }
    
    if (!events || events.length === 0) {
      return { data: [], error: null };
    }
    
    // Transform data to include business info
    let transformedData = (events || []).map(event => ({
      ...event,
      business_name: event.business_name || 'Unknown Business',
      business_logo_url: event.business_logo_url || null,
      location: event.location || 'Kuwait'
    }));
    
    // Filter by kind if needed
    if (kind && kind !== 'all') {
      transformedData = transformedData.filter(e => e.kind === kind);
    }
    
    // Filter upcoming only if needed
    if (upcomingOnly) {
      const now = new Date().toISOString();
      transformedData = transformedData.filter(e => e.start_at && e.start_at >= now);
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      transformedData = transformedData.slice(0, limit);
    }
    
    console.debug(`[events] loaded ${transformedData.length} events with business info`);
    return { data: transformedData, error: null };
  } catch (err) {
    console.error('[events] unexpected error with business:', err);
    return { data: [], error: err };
  }
}
