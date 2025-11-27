// js/businesses-utils.js - Business utilities using localStorage only (no backend, no API)
import { requireAuth, getBusinessByOwner, updateBusiness, saveBusinesses, getAllBusinesses, generateId } from './auth-localstorage.js';

// Convert file to base64 for storage
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function createBusinessRecord(fields) {
  const user = requireAuth(); // must be logged in
  
  // Convert logo file to base64 if provided
  let logoUrl = fields.logo_url || null;
  
  if (fields.logo_file && !logoUrl) {
    try {
      console.log('[businesses-utils] Converting logo file to base64:', fields.logo_file.name);
      logoUrl = await fileToBase64(fields.logo_file);
      console.log('[businesses-utils] Logo converted to base64');
    } catch (err) {
      console.error('[businesses-utils] Error converting logo:', err);
      logoUrl = null;
    }
  }
  
  // Convert gallery files to base64
  const galleryUrls = [];
  if (fields.gallery_files && fields.gallery_files.length > 0) {
    try {
      console.log('[businesses-utils] Converting', fields.gallery_files.length, 'gallery images to base64...');
      for (const file of fields.gallery_files) {
        try {
          const base64 = await fileToBase64(file);
          galleryUrls.push(base64);
          console.log('[businesses-utils] Gallery image converted:', file.name);
        } catch (err) {
          console.error('[businesses-utils] Error converting gallery image:', err);
        }
      }
    } catch (err) {
      console.error('[businesses-utils] Error converting gallery images:', err);
    }
  }
  
  const payload = {
    business_name: fields.business_name || '',
    name: fields.business_name || '',
    description: fields.description || null,
    short_description: fields.short_description || fields.description || null,
    story: fields.story || null,
    industry: fields.industry || null,
    category: fields.category || fields.industry || null,
    country: fields.country || 'Kuwait',
    city: fields.city || null,
    area: fields.area || null,
    block: fields.block || null,
    street: fields.street || null,
    floor: fields.floor || null,
    office_no: fields.office_no || null,
    phone: fields.phone || null,
    whatsapp: fields.whatsapp || null,
    website: fields.website || null,
    instagram: fields.instagram || null,
    logo_url: logoUrl,
    gallery_urls: galleryUrls,
    is_active: true,
    status: 'pending'
  };
  
  console.log('[businesses-utils] Creating business with payload:', {
    name: payload.name,
    description: payload.description ? 'Yes' : 'No',
    story: payload.story ? 'Yes' : 'No',
    phone: payload.phone || 'No',
    whatsapp: payload.whatsapp || 'No',
    website: payload.website || 'No',
    instagram: payload.instagram || 'No',
    area: payload.area || 'No',
    block: payload.block || 'No',
    street: payload.street || 'No',
    floor: payload.floor || 'No',
    office_no: payload.office_no || 'No',
    logo_url: logoUrl ? 'Yes' : 'No',
    gallery_files: fields.gallery_files ? fields.gallery_files.length : 0
  });

  // Get existing business or create new
  let business = getBusinessByOwner(user.id);
  
  if (business) {
    // Update existing business
    business = updateBusiness(business.id, payload);
    console.log('[businesses-utils] Business updated successfully:', business.id);
  } else {
    // Create new business
    const businesses = getAllBusinesses();
    business = {
      id: generateId(),
      owner_id: user.id,
      ...payload,
      created_at: new Date().toISOString()
    };
    businesses.push(business);
    saveBusinesses(businesses);
    console.log('[businesses-utils] Business created successfully:', business.id);
  }
  
  console.log('[businesses-utils] Business saved:', {
    id: business.id,
    name: business.name,
    has_description: !!business.description,
    description: business.description ? business.description.substring(0, 50) : 'NULL',
    has_story: !!business.story,
    story: business.story ? business.story.substring(0, 50) : 'NULL',
    city: business.city || 'NULL',
    area: business.area || 'NULL',
    phone: business.phone || 'NULL',
    whatsapp: business.whatsapp || 'NULL',
    website: business.website || 'NULL',
    instagram: business.instagram || 'NULL',
    has_logo: !!business.logo_url,
    logo_url: business.logo_url ? 'Yes' : 'No'
  });

  return business;
}

// Helper function to generate ID (exported from auth-localstorage)
export { generateId };
