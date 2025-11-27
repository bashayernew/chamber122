// events-public.js - Using backend API instead of Supabase
import { getPublicEvents } from '/js/api.js';

export async function loadPublicEvents(limit = 12) {
  try {
    const events = await getPublicEvents();
    
    // Sort by start_at and limit
    const sorted = events
      .filter(e => e.start_at)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .slice(0, limit);
    
    return {
      current: sorted,
      error: null
    };
  } catch (error) {
    console.error('[events-public] Error loading events:', error);
    return {
      current: [],
      error: error.message || 'Failed to load events'
    };
  }
}
