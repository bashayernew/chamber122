// js/businesses.api.js - Clean business API wrapper
console.log('[businesses.api] Module loaded');

const sb = () => {
  const client = window.__supabase || window.__supabaseClient;
  if (!client) {
    console.error('[businesses.api] Supabase client not available');
    throw new Error('Supabase client not initialized');
  }
  return client;
};

export async function createBusiness(payload) {
  const supabase = sb();
  console.log('[businesses.api] creating business with payload:', payload);
  
  const { data, error } = await supabase
    .from('businesses')
    .insert([payload])
    .select('id, name, owner_id, industry, category, country, city, area, block, street, floor, office_no, description, short_description, story, phone, whatsapp, website, instagram, logo_url, is_active, created_at, updated_at')
    .single();
  
  if (error) {
    console.error('[businesses.api] createBusiness error:', error);
    throw error;
  }
  
  console.log('[businesses.api] Business created:', data);
  return data;
}

export async function getMyBusiness(userId) {
  const supabase = sb();
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, owner_id, industry, category, country, city, area, block, street, floor, office_no, description, short_description, story, phone, whatsapp, website, instagram, logo_url, is_active, created_at, updated_at')
    .eq('owner_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('[businesses.api] getMyBusiness error:', error);
    throw error;
  }
  
  return data;
}
