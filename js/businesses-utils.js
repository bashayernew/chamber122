import { supabase } from './supabase-client.js';
import { requireSession } from './auth-signup-utils.js';

export async function createBusinessRecord(fields) {
  const user = await requireSession(); // must be logged in
  const payload = {
    owner_id: user.id, // Use owner_id (not owner_user_id) to match businesses table
    name: fields.business_name ?? '', // Use name (not business_name) to match businesses table
    industry: fields.industry ?? null,
    country: fields.country ?? null,
    is_active: true
  };

  const { data, error } = await supabase
    .from('businesses')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}



