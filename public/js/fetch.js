// /public/js/fetch.js
// Supabase query functions for events and bulletins

/**
 * Convert date and time strings to ISO datetime
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:MM) or null
 * @returns {string} ISO datetime string
 */
export function toIso(dateStr, timeStr) {
  const dt = new Date(`${dateStr}T${timeStr || '00:00'}`);
  return dt.toISOString();
}

export async function listEventsPublic(supabase) {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    const nowIso = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('activities_base')
      .select(select)
      .eq('type', 'event')
      .or('status.eq.published,is_published.is.true')
      .or(`end_at.is.null,end_at.gte.${nowIso}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching public events:', error);
    throw error;
  }
}

export async function listBulletinsPublic(supabase) {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    
    const { data, error } = await supabase
      .from('activities_base')
      .select(select)
      .eq('type', 'bulletin')
      .or('status.eq.published,is_published.is.true')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching public bulletins:', error);
    throw error;
  }
}

export async function getOwnerBusinessId(supabase) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('Error getting owner business ID:', error);
    throw error;
  }
}

export async function listActivitiesForBusiness(supabase, businessId) {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    const { data, error } = await supabase
      .from('activities_base')
      .select(select)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching business activities:', error);
    throw error;
  }
}

export async function listDraftsForBusiness(supabase, businessId) {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    const { data, error } = await supabase
      .from('activities_base')
      .select(select)
      .eq('business_id', businessId)
      .or('status.neq.published,is_published.eq.false')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching drafts:', error);
    throw error;
  }
}

export async function createEvent(supabase, payload) {
  try {
    const { data, error } = await supabase
      .from('activities_base')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function createBulletin(supabase, payload) {
  try {
    const { data, error } = await supabase
      .from('activities_base')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating bulletin:', error);
    throw error;
  }
}

// Get user's own activities (for profile page)
export async function listMyActivities(supabase) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activities_base')
      .select('id,type,title,status,created_at,cover_image_url,start_at,end_at')
      .eq('created_by', uid)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching my activities:', error);
    throw error;
  }
}

// Get user's events only
export async function listMyEvents(supabase) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activities_base')
      .select('id,type,title,status,created_at,cover_image_url,start_at,end_at')
      .eq('created_by', uid)
      .eq('type', 'event')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching my events:', error);
    throw error;
  }
}

// Get user's bulletins only
export async function listMyBulletins(supabase) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activities_base')
      .select('id,type,title,status,created_at,cover_image_url,start_at,end_at')
      .eq('created_by', uid)
      .eq('type', 'bulletin')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching my bulletins:', error);
    throw error;
  }
}

// Get dashboard counts
export async function getDashboardCounts(supabase) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    const base = supabase
      .from('activities_base')
      .select('id,type,status', { count: 'exact', head: true })
      .eq('created_by', uid);

    const [eventsPublished, bulletinsPublished, drafts] = await Promise.all([
      base.eq('type','event').eq('status','published'),
      base.eq('type','bulletin').eq('status','published'),
      base.eq('status','draft'),
    ]);

    return {
      eventsPublished: eventsPublished.count || 0,
      bulletinsPublished: bulletinsPublished.count || 0,
      drafts: drafts.count || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard counts:', error);
    throw error;
  }
}
