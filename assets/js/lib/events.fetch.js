// /assets/js/lib/events.fetch.js
// Get supabase client - try multiple methods
async function getSupabase() {
  // Wait a bit for the client to be available
  for (let i = 0; i < 10; i++) {
    // Try window.__supabaseClient (from global client) first
    if (window.__supabaseClient) {
      return window.__supabaseClient;
    }
    // Try window.supabase (legacy)
    if (window.supabase) {
      return window.supabase;
    }
    // Wait 100ms before next attempt
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Try importing from global client
  try {
    const { supabase } = await import('/public/js/supabase-client.global.js');
    if (supabase) {
      window.__supabaseClient = supabase; // Cache it
      return supabase;
    }
  } catch (e) {
    console.warn('[events.fetch] Could not import supabase client:', e);
  }
  
  // Final check
  if (window.__supabaseClient) {
    return window.__supabaseClient;
  }
  if (window.supabase) {
    return window.supabase;
  }
  
  throw new Error('Supabase client not available. Make sure supabase-client.global.js is loaded.');
}

/**
 * Unified events fetch function with proper RLS handling
 * @param {Object} options - Fetch options
 * @param {string} options.scope - 'public' or 'owner'
 * @param {string} options.kind - Event kind filter ('all' for no filter)
 * @param {boolean} options.upcomingOnly - Whether to filter for upcoming events only
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchEvents({ scope = 'public', kind = 'all', upcomingOnly = true } = {}) {
  try {
    console.debug(`[events] loading scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}`);
    
    const supabase = await getSupabase();
    let query = supabase
      .from('events')
      .select('id, title, status, is_published, start_at, kind, business_id, created_at, description, cover_image_url, governorate, area, street, block, floor, contact_name, contact_phone, contact_email, end_at')
      .order('start_at', { ascending: true });

    if (scope === 'public') {
      // Public scope: only published events
      query = query.eq('status', 'published').eq('is_published', true);
      if (upcomingOnly) {
        query = query.gte('start_at', new Date().toISOString());
      }
    } else if (scope === 'owner') {
      // Owner scope: RLS exposes only the owner's rows; do not hide drafts here
      // Optionally keep upcomingOnly for the owner's default view:
      if (upcomingOnly) {
        query = query.gte('start_at', new Date().toISOString());
      }
    }

    if (kind && kind !== 'all') {
      query = query.eq('kind', kind);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[events] query failed:', error);
      return { data: [], error };
    }
    
    console.debug(`[events] loaded ${data?.length || 0} events`);
    return { data: data || [], error: null };
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
export async function fetchEventsWithBusiness({ scope = 'public', kind = 'all', upcomingOnly = true, limit = null } = {}) {
  try {
    console.debug(`[events] loading with business info scope=${scope}, kind=${kind}, upcomingOnly=${upcomingOnly}, limit=${limit}`);
    
    const supabase = await getSupabase();
    let query = supabase
      .from('events')
      .select(`
        id, title, status, is_published, start_at, kind, business_id, created_at, 
        description, cover_image_url, governorate, area, street, block, floor, 
        contact_name, contact_phone, contact_email, end_at,
        businesses!inner(name, logo_url)
      `)
      .order('created_at', { ascending: false }); // Most recent first

    if (scope === 'public') {
      query = query.eq('status', 'published').eq('is_published', true);
      if (upcomingOnly) {
        query = query.gte('start_at', new Date().toISOString());
      }
    } else if (scope === 'owner') {
      if (upcomingOnly) {
        query = query.gte('start_at', new Date().toISOString());
      }
    }

    if (kind && kind !== 'all') {
      query = query.eq('kind', kind);
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[events] query with business failed:', error);
      return { data: [], error };
    }

    // Transform data to include business info
    const transformedData = (data || []).map(event => ({
      ...event,
      business_name: event.businesses?.name || 'Unknown Business',
      business_logo_url: event.businesses?.logo_url,
      location: [event.governorate, event.area, event.street, event.block, event.floor]
        .filter(Boolean)
        .join(', ')
    }));

    console.debug(`[events] loaded ${transformedData.length} events with business info`);
    return { data: transformedData, error: null };
  } catch (err) {
    console.error('[events] unexpected error with business:', err);
    return { data: [], error: err };
  }
}

    }

    if (kind && kind !== 'all') {
      query = query.eq('kind', kind);
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[events] query with business failed:', error);
      return { data: [], error };
    }

    // Transform data to include business info
    const transformedData = (data || []).map(event => ({
      ...event,
      business_name: event.businesses?.name || 'Unknown Business',
      business_logo_url: event.businesses?.logo_url,
      location: [event.governorate, event.area, event.street, event.block, event.floor]
        .filter(Boolean)
        .join(', ')
    }));

    console.debug(`[events] loaded ${transformedData.length} events with business info`);
    return { data: transformedData, error: null };
  } catch (err) {
    console.error('[events] unexpected error with business:', err);
    return { data: [], error: err };
  }
}
