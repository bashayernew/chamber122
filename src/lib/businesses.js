import { supabase } from './supabase-client';
import { requireSession } from './auth-signup-utils';

export async function createBusinessRecord(fields) {
  const user = await requireSession();
  const payload = {
    // Use both new & legacy names so either works with the SQL patch
    owner_user_id: user.id,
    owner_id: user.id,
    business_name: fields.business_name ?? fields.name ?? '',
    name: fields.business_name ?? fields.name ?? '',
    industry: fields.industry ?? null,
    country: fields.country ?? null,
    city: fields.city ?? null,
    short_description: fields.short_description ?? null,
    description: fields.description ?? null,
    whatsapp: fields.whatsapp ?? null,
    logo_url: fields.logo_url ?? null,
    is_active: true
  };
  const { data, error } = await supabase.from('businesses').insert(payload).select().single();
  if (error) throw error;
  return data;
}