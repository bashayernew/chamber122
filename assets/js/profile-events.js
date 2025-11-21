import { supabase } from './supabase-client.global.js';
import { fetchEvents } from './lib/events.fetch.js';

// Ensure supabase is available on window for events.fetch.js
if (typeof window !== 'undefined' && supabase) {
  window.__supabaseClient = supabase;
  window.supabase = supabase; // Also set for legacy compatibility
}

export async function loadOwnerEventsAndBulletins(ownerId, isOwnerViewingOwnProfile = false) {
  const now = new Date().toISOString();

  // Load events directly by business_id (don't rely on RLS scope='owner' when viewing someone else's profile)
  let eventsQuery = supabase
    .from('events')
    .select('id, title, status, is_published, start_at, kind, business_id, created_at, description, cover_image_url, governorate, area, street, block, floor, contact_name, contact_phone, contact_email, end_at')
    .eq('business_id', ownerId)
    .order('start_at', { ascending: true });

  // If viewing someone else's profile, only show published events
  // If viewing own profile, show all events (including drafts)
  if (!isOwnerViewingOwnProfile) {
    eventsQuery = eventsQuery.eq('status', 'published').eq('is_published', true);
  }

  const { data: ownerEvents = [], error: e1 } = await eventsQuery;

  if (e1) {
    console.error('[profile-events] Error loading events:', e1);
  }

  // Categorize events by time
  // Events without dates go to "upcoming" as a default
  const ongoing  = ownerEvents.filter(e => {
    if (!e.start_at || !e.end_at) return false;
    return e.start_at <= now && e.end_at >= now;
  });
  const upcoming = ownerEvents.filter(e => {
    // Include events without start_at in upcoming
    if (!e.start_at) return true;
    return e.start_at > now;
  });
  const previous = ownerEvents.filter(e => {
    // Only include in previous if it has an end_at and it's in the past
    if (!e.end_at) return false;
    return e.end_at < now;
  });

  // Load bulletins - handle different schema variations
  // Try multiple approaches to find bulletins
  let pubs = [];
  let b1 = null;
  
  // Get the business to find owner_id
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('owner_id, id')
    .eq('id', ownerId)
    .maybeSingle();
  
  if (bizErr && bizErr.code !== 'PGRST116') {
    console.error('[profile-events] Error fetching business for bulletins:', bizErr);
  }
  
  // Try different column combinations based on schema
  // Method 1: Try business_id first
  let result1 = await supabase
    .from('bulletins')
    .select('*')
    .eq('business_id', ownerId)
    .order('created_at', { ascending: false });
  
  let result2 = null;
  if (result1.error || !result1.data || result1.data.length === 0) {
    // Try owner_business_id
    result2 = await supabase
      .from('bulletins')
      .select('*')
      .eq('owner_business_id', ownerId)
      .order('created_at', { ascending: false });
  }
  
  // Merge results from both queries
  let result = result1;
  if (result2 && !result2.error && result2.data && result2.data.length > 0) {
    // Combine results, removing duplicates
    const combined = [...(result1.data || []), ...(result2.data || [])];
    const unique = combined.filter((b, index, self) => 
      index === self.findIndex((t) => t.id === b.id)
    );
    result = { data: unique, error: null };
  } else if (result2 && !result2.error && result2.data && result2.data.length > 0) {
    result = result2;
  }
  
  b1 = result.error;
  
  // If business_id/owner_business_id query fails or returns no results, try owner_user_id
  if ((b1 || !result.data || result.data.length === 0) && business && business.owner_id) {
    console.log('[profile-events] Trying owner_user_id query for bulletins');
    const altResult = await supabase
      .from('bulletins')
      .select('*')
      .eq('owner_user_id', business.owner_id)
      .order('created_at', { ascending: false });
    
    if (!altResult.error && altResult.data && altResult.data.length > 0) {
      // Merge with existing results
      const existing = result.data || [];
      const combined = [...existing, ...altResult.data];
      const unique = combined.filter((b, index, self) => 
        index === self.findIndex((t) => t.id === b.id)
      );
      result = { data: unique, error: null };
      b1 = null;
    }
  }
  
  pubs = result.data || [];
  
  console.log('[profile-events] Loaded bulletins:', {
    count: pubs.length,
    ownerId: ownerId,
    businessOwnerId: business?.owner_id,
    firstBulletin: pubs[0] ? {
      id: pubs[0].id,
      title: pubs[0].title,
      business_id: pubs[0].business_id,
      owner_business_id: pubs[0].owner_business_id,
      owner_user_id: pubs[0].owner_user_id,
      status: pubs[0].status
    } : null
  });
  
  // Filter by status if viewing someone else's profile
  if (!isOwnerViewingOwnProfile && !b1) {
    pubs = pubs.filter(b => b.status === 'published');
  }
  
  // If viewing own profile, show all bulletins (including drafts)
  // But still filter if there was an error
  if (b1 && b1.code !== 'PGRST116') { // PGRST116 is "no rows returned", not a real error
    console.error('[profile-events] Error loading bulletins:', b1);
    // Don't clear pubs if we got some results before the error
    if (pubs.length === 0) {
      pubs = []; // Only clear if we have no results
    }
  }

  // Support both start_at/end_at and start_date/deadline_date field variants
  const getStart = (b) => b.start_at || b.start_date || b.publish_at || null;
  const getEnd   = (b) => b.end_at || b.deadline_date || b.end_date || b.expire_at || null;

  // Ensure pubs is an array
  const bulletinsArray = Array.isArray(pubs) ? pubs : [];
  
  // Categorize bulletins:
  // - Ongoing: has start and end, and currently between them, OR no dates (assume ongoing)
  // - Upcoming: has start date in the future
  // - Previous: has end date in the past
  const b_ongoing  = bulletinsArray.filter(b => {
    const s = getStart(b);
    const e = getEnd(b);
    // If no dates, consider it ongoing
    if (!s && !e) return true;
    // If has both dates, check if currently between them
    if (s && e) return s <= now && e >= now;
    // If only has start date and it's in the past, it's ongoing
    if (s && !e) return s <= now;
    // If only has end date and it's in the future, it's ongoing
    if (!s && e) return e >= now;
    return false;
  });
  
  const b_upcoming = bulletinsArray.filter(b => {
    const s = getStart(b);
    // Only upcoming if has start date and it's in the future
    return s && s > now;
  });
  
  const b_previous = bulletinsArray.filter(b => {
    const e = getEnd(b);
    // Only previous if has end date and it's in the past
    return e && e < now;
  });
  
  console.log('[profile-events] Categorized bulletins:', {
    total: bulletinsArray.length,
    ongoing: b_ongoing.length,
    upcoming: b_upcoming.length,
    previous: b_previous.length
  });

  return {
    events: { ongoing, upcoming, previous, error: e1 || null },
    bulletins: { ongoing: b_ongoing, upcoming: b_upcoming, previous: b_previous, error: b1 || null }
  };
}

  // Get the business to find owner_id
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('owner_id, id')
    .eq('id', ownerId)
    .maybeSingle();
  
  if (bizErr && bizErr.code !== 'PGRST116') {
    console.error('[profile-events] Error fetching business for bulletins:', bizErr);
  }
  
  // Try different column combinations based on schema
  // Method 1: Try business_id first
  let result1 = await supabase
    .from('bulletins')
    .select('*')
    .eq('business_id', ownerId)
    .order('created_at', { ascending: false });
  
  let result2 = null;
  if (result1.error || !result1.data || result1.data.length === 0) {
    // Try owner_business_id
    result2 = await supabase
      .from('bulletins')
      .select('*')
      .eq('owner_business_id', ownerId)
      .order('created_at', { ascending: false });
  }
  
  // Merge results from both queries
  let result = result1;
  if (result2 && !result2.error && result2.data && result2.data.length > 0) {
    // Combine results, removing duplicates
    const combined = [...(result1.data || []), ...(result2.data || [])];
    const unique = combined.filter((b, index, self) => 
      index === self.findIndex((t) => t.id === b.id)
    );
    result = { data: unique, error: null };
  } else if (result2 && !result2.error && result2.data && result2.data.length > 0) {
    result = result2;
  }
  
  b1 = result.error;
  
  // If business_id/owner_business_id query fails or returns no results, try owner_user_id
  if ((b1 || !result.data || result.data.length === 0) && business && business.owner_id) {
    console.log('[profile-events] Trying owner_user_id query for bulletins');
    const altResult = await supabase
      .from('bulletins')
      .select('*')
      .eq('owner_user_id', business.owner_id)
      .order('created_at', { ascending: false });
    
    if (!altResult.error && altResult.data && altResult.data.length > 0) {
      // Merge with existing results
      const existing = result.data || [];
      const combined = [...existing, ...altResult.data];
      const unique = combined.filter((b, index, self) => 
        index === self.findIndex((t) => t.id === b.id)
      );
      result = { data: unique, error: null };
      b1 = null;
    }
  }
  
  pubs = result.data || [];
  
  console.log('[profile-events] Loaded bulletins:', {
    count: pubs.length,
    ownerId: ownerId,
    businessOwnerId: business?.owner_id,
    firstBulletin: pubs[0] ? {
      id: pubs[0].id,
      title: pubs[0].title,
      business_id: pubs[0].business_id,
      owner_business_id: pubs[0].owner_business_id,
      owner_user_id: pubs[0].owner_user_id,
      status: pubs[0].status
    } : null
  });
  
  // Filter by status if viewing someone else's profile
  if (!isOwnerViewingOwnProfile && !b1) {
    pubs = pubs.filter(b => b.status === 'published');
  }
  
  // If viewing own profile, show all bulletins (including drafts)
  // But still filter if there was an error
  if (b1 && b1.code !== 'PGRST116') { // PGRST116 is "no rows returned", not a real error
    console.error('[profile-events] Error loading bulletins:', b1);
    // Don't clear pubs if we got some results before the error
    if (pubs.length === 0) {
      pubs = []; // Only clear if we have no results
    }
  }

  // Support both start_at/end_at and start_date/deadline_date field variants
  const getStart = (b) => b.start_at || b.start_date || b.publish_at || null;
  const getEnd   = (b) => b.end_at || b.deadline_date || b.end_date || b.expire_at || null;

  // Ensure pubs is an array
  const bulletinsArray = Array.isArray(pubs) ? pubs : [];
  
  // Categorize bulletins:
  // - Ongoing: has start and end, and currently between them, OR no dates (assume ongoing)
  // - Upcoming: has start date in the future
  // - Previous: has end date in the past
  const b_ongoing  = bulletinsArray.filter(b => {
    const s = getStart(b);
    const e = getEnd(b);
    // If no dates, consider it ongoing
    if (!s && !e) return true;
    // If has both dates, check if currently between them
    if (s && e) return s <= now && e >= now;
    // If only has start date and it's in the past, it's ongoing
    if (s && !e) return s <= now;
    // If only has end date and it's in the future, it's ongoing
    if (!s && e) return e >= now;
    return false;
  });
  
  const b_upcoming = bulletinsArray.filter(b => {
    const s = getStart(b);
    // Only upcoming if has start date and it's in the future
    return s && s > now;
  });
  
  const b_previous = bulletinsArray.filter(b => {
    const e = getEnd(b);
    // Only previous if has end date and it's in the past
    return e && e < now;
  });
  
  console.log('[profile-events] Categorized bulletins:', {
    total: bulletinsArray.length,
    ongoing: b_ongoing.length,
    upcoming: b_upcoming.length,
    previous: b_previous.length
  });

  return {
    events: { ongoing, upcoming, previous, error: e1 || null },
    bulletins: { ongoing: b_ongoing, upcoming: b_upcoming, previous: b_previous, error: b1 || null }
  };
}
