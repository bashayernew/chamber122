// Common activities helpers for creating events and bulletins
import { supabase } from './supabase-client.js';

/**
 * Get the current user's business ID
 * @returns {Promise<string>} business_id
 * @throws {Error} if not signed in or no business found
 */
export async function getCurrentUserBusinessId() {
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) throw uerr;
  if (!user) throw new Error('Not signed in');
  
  const { data, error } = await supabase
    .from('businesses')
    .select('id, owner_id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) throw new Error('No business profile found for this user');
  
  console.info('[create] business_id=', data.id, 'owner_id=', data.owner_id);
  return data.id;
}

/**
 * Upload cover image to business-assets bucket
 * @param {File} file - The image file to upload
 * @param {string} businessId - The business ID for folder organization
 * @returns {Promise<string|null>} publicUrl or null if no file
 * @throws {Error} if upload fails
 */
export async function uploadCover(file, businessId) {
  if (!file) return null;
  
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const key = `activities/${businessId}/${crypto.randomUUID()}.${ext}`;
  
  const { error: upErr } = await supabase
    .storage.from('business-assets')
    .upload(key, file, { 
      upsert: true, 
      contentType: file.type || 'image/png' 
    });
  
  if (upErr) throw upErr;
  
  const { data: { publicUrl } } = supabase.storage
    .from('business-assets')
    .getPublicUrl(key);
  
  return publicUrl;
}

/**
 * Create an activity in the base table
 * @param {Object} payload - Activity data
 * @param {string} payload.type - 'event' or 'bulletin'
 * @param {string} payload.business_id - Business ID
 * @param {string} payload.title - Title
 * @param {string} payload.description - Description
 * @param {string} payload.status - 'draft', 'pending', or 'published'
 * @param {boolean} payload.is_published - Published flag
 * @returns {Promise<Object>} Created activity record
 * @throws {Error} if insert fails
 */
export async function createActivityBase(payload) {
  if (!payload?.business_id) throw new Error('Missing business_id');
  
  const { data, error } = await supabase
    .from('activities_base')  // WRITE TO BASE TABLE with 'type' column
    .insert([payload])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Normalize activity records - converts kind to type for consistency
 * @param {Array<Object>} records - Array of activity records from VIEW
 * @returns {Array<Object>} Normalized records with type field
 */
export function normalizeActivities(records) {
  return (records || []).map(r => ({ 
    ...r, 
    type: r.type ?? r.kind 
  }));
}

