import { supabase } from './supabase-client.global.js';

export async function loadPublicEvents(limit = 12) {
  const now = new Date().toISOString();

  const current = await supabase.from('activities_current')
    .select('id,business_id,business_name,business_logo_url,title,description,location,cover_image_url,created_at,start_at,end_at,contact_phone,contact_email')
    .eq('type','event')
    .order('start_at', { ascending: true }).limit(limit);

  return {
    current: current.data ?? [],
    error: current.error || null
  };
}
