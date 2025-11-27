// /js/lib/events.fetch.js - Events fetching using backend API
import { getPublicEvents } from '../api.js';

/**
 * Unified events fetch function
 * @param {Object} options - Fetch options
 * @param {string} options.scope - 'public' or 'owner' (owner not yet implemented)
 * @param {string} options.kind - Event kind filter ('all' for no filter) - not yet implemented
 * @param {boolean} options.upcomingOnly - Whether to filter for upcoming events only
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchEvents({ scope = 'public', kind = 'all', upcomingOnly = true } = {}) {
  try {
    console.debug(`[events] loading scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}`);
    
    // For now, only public events are supported
    if (scope !== 'public') {
      console.warn('[events] Owner scope not yet implemented');
      return { data: [], error: null };
    }
    
    const events = await getPublicEvents();
    
    // Filter for upcoming only if requested
    let filtered = events;
    if (upcomingOnly) {
      const now = new Date();
      filtered = events.filter(event => {
        if (!event.start_at) return false;
        return new Date(event.start_at) >= now;
      });
    }
    
    // Filter by kind if specified (not yet implemented in backend)
    if (kind && kind !== 'all') {
      filtered = filtered.filter(event => event.kind === kind);
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
    console.log(`[events.fetch] Loading events: scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}, limit=${limit}`);
    
    const events = await getPublicEvents();
    console.log(`[events.fetch] Got ${events?.length || 0} events from API:`, events);
    
    // Filter for upcoming only if requested
    let filtered = events || [];
    if (upcomingOnly) {
      const now = new Date();
      filtered = filtered.filter(event => {
        if (!event.start_at) return false;
        return new Date(event.start_at) >= now;
      });
    }
    
    // Filter by kind if specified
    if (kind && kind !== 'all') {
      filtered = filtered.filter(event => event.kind === kind);
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    // Transform data to include business info (already included from API)
    const transformedData = filtered.map(event => ({
      ...event,
      business_name: event.business_name || 'Chamber122',
      business_logo_url: event.business_logo_url || null,
      location: event.location || 'Kuwait'
    }));

    console.log(`[events.fetch] Returning ${transformedData.length} events with business info`);
    return { data: transformedData, error: null };
  } catch (err) {
    console.error('[events.fetch] Error loading events:', err);
    return { data: [], error: err };
  }
}
