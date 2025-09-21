// public/js/businesses.api.js
import { supabase } from '/js/supabase-client.js';

export async function getMyBusiness() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyBusiness(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Map only columns that actually exist in the table
  const body = {
    owner_id: user.id,
    name: payload.name ?? null,
    owner_full_name: payload.owner_full_name ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    category: payload.category ?? null,
    city: payload.city ?? null,
    country: payload.country ?? 'Kuwait',
    description: payload.description ?? null,
    story: payload.story ?? null,
    website: payload.website ?? null,
    instagram: payload.instagram ?? null,
    facebook: payload.facebook ?? null,
    logo_url: payload.logo_url ?? null,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
    is_public: payload.is_public ?? true
  };

  const { data, error } = await supabase
    .from('businesses')
    .upsert(body, { onConflict: 'owner_id' })
    .select()
    .single();

  return { data, error };
}