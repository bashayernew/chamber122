// js/businesses.api.js v=2 (ESM)
import { supabase } from '../public/js/supabase-client.global.js';

console.log('[businesses.api] Module loaded');

export async function getMyBusiness() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    
    console.log('[businesses.api] Fetching business for user:', user.id);
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (error) throw error;
    
    console.log('[businesses.api] Business fetched:', data ? 'found' : 'not found');
    return data;
  } catch (error) {
    console.error('[businesses.api] Error in getMyBusiness:', error);
    throw error;
  }
}

export async function upsertMyBusiness(payload) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    console.log('[businesses.api] Upserting business for user:', user.id);
    console.log('[businesses.api] Payload:', payload);

    // Map only columns that exist in the table
    const body = {
      owner_id: user.id,
      name: payload.name ?? null,
      short_description: payload.short_description ?? payload.description ?? null,
      industry: payload.category ?? payload.industry ?? null,
      city: payload.city ?? null,
      country: payload.country ?? 'Kuwait',
      whatsapp: payload.whatsapp ?? payload.phone ?? null,
      logo_url: payload.logo_url ?? null,
    };

    const { data, error } = await supabase
      .from('businesses')
      .upsert(body, { onConflict: 'owner_id' })
      .select()
      .single();

    if (error) {
      console.error('[businesses.api] Upsert error:', error);
      throw error;
    }

    console.log('[businesses.api] Upsert successful:', data);
    return { data, error: null };
  } catch (error) {
    console.error('[businesses.api] Error in upsertMyBusiness:', error);
    return { data: null, error };
  }
}
