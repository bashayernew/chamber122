// API helpers for Supabase data access
// Handles all database operations with proper error handling
import { supabase } from './supabase-client.global.js';

/**
 * Combine date and time strings into ISO datetime
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:MM) or null
 * @returns {string} ISO datetime string
 */
export function combineToIso(dateStr, timeStr) {
  // "2025-10-01" + "09:30" -> "2025-10-01T09:30:00.000Z" (adjust if you want local TZ)
  const dt = new Date(`${dateStr}T${timeStr || '00:00'}`);
  return dt.toISOString();
}

/**
 * Get the business ID for the currently authenticated owner
 * @returns {Promise<string|null>} Business ID or null if not found/authenticated
 */
export async function getOwnerBusinessId() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (bizError && bizError.code !== 'PGRST116') throw bizError; // PGRST116 = no rows found
    return business ? business.id : null;
  } catch (error) {
    console.error('Error getting owner business ID:', error);
    throw new Error(error.message);
  }
}

/**
 * List public events (published and visible)
 * @returns {Promise<Array>} Array of published events
 */
export async function listEventsPublic() {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    const { data, error } = await supabase
      .from('activities')  // VIEW for reads
      .select(select)
      .eq('kind', 'event')  // VIEW uses 'kind' column
      .eq('status', 'published')
      .eq('is_published', true)
      .order('start_at', { ascending: true });  // Valid column
    
    if (error) throw error;
    // Normalize type field
    const normalized = (data || []).map(r => ({ ...r, type: r.type ?? r.kind }));
    return normalized;
  } catch (error) {
    console.error('Error listing public events:', error);
    throw new Error(error.message);
  }
}

/**
 * Create a new event
 * @param {Object} input - Event data
 * @returns {Promise<string>} Created event ID
 */
export async function createEvent(input) {
  try {
    const { data, error } = await supabase
      .from('activities_base')
      .insert(input)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(error.message);
  }
}

/**
 * List activities for a business (unified feed)
 * @param {string} businessId - Business ID
 * @returns {Promise<Array>} Array of activities
 */
export async function listActivitiesForBusiness(businessId) {
  try {
    console.log('[api] listActivitiesForBusiness called with businessId:', businessId);
    const select = "*,businesses:business_id(name,logo_url)";
    console.log('[api] Querying activities_base table with select:', select);
    const { data, error } = await supabase
      .from('activities_base')  // Use activities_base table directly
      .select(select)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Normalize: activities_base uses 'type', ensure it's consistent
    const normalized = (data || []).map(r => ({ ...r, type: r.type }));
    console.log('[api] listActivitiesForBusiness result:', normalized.length, 'activities');
    return normalized;
  } catch (error) {
    console.error('Error listing activities for business:', error);
    throw new Error(error.message);
  }
}

/**
 * List drafts for a business (unpublished events and bulletins)
 * @param {string} businessId - Business ID
 * @returns {Promise<Array>} Array of draft items with type field
 */
export async function listDraftsForBusiness(businessId) {
  try {
    const select = "*,businesses:business_id(name,logo_url)";
    const { data, error } = await supabase
      .from('activities')  // VIEW for reads
      .select(select)
      .eq('business_id', businessId)
      .eq('status', 'draft')  // Only drafts
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Normalize: VIEW exposes 'kind', we normalize to 'type'
    const normalized = (data || []).map(r => ({ ...r, type: r.type ?? r.kind }));
    return normalized;
  } catch (error) {
    console.error('Error listing drafts for business:', error);
    throw new Error(error.message);
  }
}

/**
 * Create a new bulletin
 * @param {Object} input - Bulletin data
 * @returns {Promise<string>} Created bulletin ID
 */
export async function createBulletin(input) {
  try {
    const { data, error } = await supabase
      .from('activities_base')
      .insert(input)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating bulletin:', error);
    throw new Error(error.message);
  }
}

function ensureExt(file) {
  const guess = (file?.type || '').split('/')[1] || 'jpg';
  return guess.toLowerCase();
}

function uuid() {
  return crypto.randomUUID?.() ?? String(Date.now());
}

/**
 * Upload event cover image to business-media bucket with proper key format
 * @param {File} file - File to upload
 * @param {string} businessId - Business ID
 * @returns {Promise<{url: string|null, usedFallback: boolean}>} Upload result
 */
export async function uploadEventCover(file, businessId) {
  if (!file) return { url: null, usedFallback: false };
  if (!businessId) {
    console.error('[upload] missing businessId'); 
    return { url: null, usedFallback: false };
  }

  const ext = ensureExt(file);
  const key = `${businessId}/events/${uuid()}.${ext}`;   // MUST START WITH businessId
  console.log('[upload] businessId:', businessId);
  console.log('[upload] key:', key, 'type:', file.type, 'size:', file.size);

  try {
    const { error: upErr } = await supabase
      .storage
      .from('business-media')
      .upload(key, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || `image/${ext}`,
      });

    if (upErr) {
      console.error('[upload] storage upload error:', upErr);
      throw upErr;
    }

    const { data: pub } = supabase.storage.from('business-media').getPublicUrl(key);
    console.log('[upload] public URL:', pub?.publicUrl);
    return { url: pub?.publicUrl ?? null, usedFallback: false };
  } catch (e) {
    // Show the raw error for debugging (status/message if present)
    console.error('[upload] upload failed (will fallback):', e);
    // Data-URL fallback for development
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    console.warn('[upload] using data URL fallback (dev only)');
    return { url: dataUrl, usedFallback: true };
  }
}

/**
 * Upload file to business-media bucket (legacy function - use uploadEventCover instead)
 * @param {File} file - File to upload
 * @param {string} businessId - Business ID
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadCoverImage(file, businessId) {
  const result = await uploadEventCover(file, businessId);
  return result.url;
}

/**
 * Toast notification helper
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 */
export function toast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  const toastEl = document.createElement('div');
  toastEl.className = `toast fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
  
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  toastEl.className += ` ${bgColor} text-white`;
  
  toastEl.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toastEl);
  
  // Animate in
  setTimeout(() => {
    toastEl.classList.remove('translate-x-full');
  }, 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toastEl.classList.add('translate-x-full');
    setTimeout(() => toastEl.remove(), 300);
  }, 5000);
}
