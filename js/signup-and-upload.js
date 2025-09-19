import { supabase } from './supabase-client.js';
import { uploadDoc } from './upload-doc.js';
import { signupWithEmailPassword, requireSession } from './auth-signup-utils.js';

export { signupWithEmailPassword };

export async function createBusinessRecord(fields) {
  const user = await requireSession(); // must be logged in
  const payload = {
    owner_id: user.id, // Use owner_id to match businesses table
    name: fields.business_name ?? '', // Use name to match businesses table
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

export async function createProfileRecord(fields) {
  const user = await requireSession(); // Use the same auth check
  const uid = user.id;

  // Only the columns that exist in public.profiles (based on migration 0006)
  const payload = {
    id: uid,
    logo_url: fields.logo_url ?? null,
    contact_email: fields.contact_email ?? null,
    phone: fields.phone ?? null,
    whatsapp: fields.whatsapp ?? null,
    about_short: fields.about_short ?? null,
    about_full: fields.about_full ?? null,
    address: fields.address ?? null
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadTempDocuments(files) {
  const uploaded = {};
  for (const [docType, file] of Object.entries(files || {})) {
    if (!file) continue;
    const res = await uploadDoc(file, docType, 'temp');
    uploaded[docType] = { path: res.path, preview: res.signedUrl };
  }
  return uploaded; // includes preview URLs
}
