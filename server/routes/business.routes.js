// server/routes/business.routes.js - Business routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const { upload, getPublicUrl } = require('../uploads');
const crypto = require('crypto');

// POST /api/business/upsert - Handles both JSON and multipart/form-data
// Support both 'gallery' and 'gallery[]' field names for compatibility
const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
  { name: 'gallery[]', maxCount: 5 }, // Support array notation from frontend
  { name: 'license', maxCount: 1 },
  { name: 'articles', maxCount: 1 },
  { name: 'signature_auth', maxCount: 1 },
  { name: 'iban', maxCount: 1 },
  { name: 'civil_id_front', maxCount: 1 },
  { name: 'civil_id_back', maxCount: 1 },
  { name: 'owner_proof', maxCount: 1 }
]);

router.post('/upsert', requireAuth, uploadFields, async (req, res) => {
  try {
    const userId = req.user.id;
    // Handle both JSON body and form fields
    const businessData = req.body || {};

    // Check if business exists
    const existing = await db.get('SELECT id FROM businesses WHERE owner_id = ?', [userId]);

    const now = new Date().toISOString();
    let businessId = existing?.id;

    // Handle file uploads first to get URLs
    let logoUrl = businessData.logo_url || null;
    const galleryUrls = businessData.gallery_urls || [];
    
    // Upload logo if provided
    if (req.files?.logo && req.files.logo.length > 0) {
      const logoFile = req.files.logo[0];
      logoUrl = getPublicUrl(logoFile.path);
      businessData.logo_url = logoUrl;
    }

    // Upload gallery images if provided
    if (req.files?.gallery && req.files.gallery.length > 0) {
      for (const file of req.files.gallery) {
        const publicUrl = getPublicUrl(file.path);
        galleryUrls.push(publicUrl);
      }
    }
    
    // Create or update business first
    if (existing) {
      businessId = existing.id;
      // Update existing business
      await db.run(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          business_name = COALESCE(?, business_name),
          description = COALESCE(?, description),
          short_description = COALESCE(?, short_description),
          story = COALESCE(?, story),
          industry = COALESCE(?, industry),
          category = COALESCE(?, category),
          country = COALESCE(?, country),
          city = COALESCE(?, city),
          area = COALESCE(?, area),
          block = COALESCE(?, block),
          street = COALESCE(?, street),
          floor = COALESCE(?, floor),
          office_no = COALESCE(?, office_no),
          phone = COALESCE(?, phone),
          whatsapp = COALESCE(?, whatsapp),
          website = COALESCE(?, website),
          instagram = COALESCE(?, instagram),
          logo_url = COALESCE(?, logo_url),
          is_active = COALESCE(?, is_active),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE owner_id = ?
      `, [
        businessData.name || businessData.business_name,
        businessData.business_name || businessData.name,
        businessData.description,
        businessData.short_description,
        businessData.story,
        businessData.industry,
        businessData.category,
        businessData.country,
        businessData.city,
        businessData.area,
        businessData.block,
        businessData.street,
        businessData.floor,
        businessData.office_no,
        businessData.phone,
        businessData.whatsapp,
        businessData.website,
        businessData.instagram,
        businessData.logo_url,
        businessData.is_active !== undefined ? businessData.is_active : 1,
        businessData.status,
        now,
        userId
      ]);
    } else {
      // Create new business
      businessId = crypto.randomUUID();
      await db.run(`
        INSERT INTO businesses (
          id, owner_id, name, business_name, description, short_description, story,
          industry, category, country, city, area, block, street, floor, office_no,
          phone, whatsapp, website, instagram, logo_url, is_active, status,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        businessId,
        userId,
        businessData.name || businessData.business_name || '',
        businessData.business_name || businessData.name || '',
        businessData.description || null,
        businessData.short_description || null,
        businessData.story || null,
        businessData.industry || null,
        businessData.category || null,
        businessData.country || 'Kuwait',
        businessData.city || null,
        businessData.area || null,
        businessData.block || null,
        businessData.street || null,
        businessData.floor || null,
        businessData.office_no || null,
        businessData.phone || null,
        businessData.whatsapp || null,
        businessData.website || null,
        businessData.instagram || null,
        businessData.logo_url || null,
        businessData.is_active !== undefined ? businessData.is_active : 1,
        businessData.status || 'pending',
        now,
        now
      ]);
    }

    // Now save media records (business exists at this point)
    // Save logo to business_media
    if (logoUrl && req.files?.logo && req.files.logo.length > 0) {
      const mediaId = crypto.randomUUID();
      await db.run(`
        INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
        VALUES (?, ?, ?, ?, ?)
      `, [mediaId, businessId, logoUrl, req.files.logo[0].mimetype, 'logo']);
    }

    // Save gallery images to business_media
    if (req.files?.gallery && req.files.gallery.length > 0) {
      for (const file of req.files.gallery) {
        const publicUrl = getPublicUrl(file.path);
        const mediaId = crypto.randomUUID();
        await db.run(`
          INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
          VALUES (?, ?, ?, ?, ?)
        `, [mediaId, businessId, publicUrl, file.mimetype, 'gallery']);
      }
    }

    // Upload documents if provided
    const documentTypes = ['license', 'articles', 'signature_auth', 'iban'];
    for (const docType of documentTypes) {
      if (req.files?.[docType] && req.files[docType].length > 0) {
        const file = req.files[docType][0];
        const publicUrl = getPublicUrl(file.path);
        const mediaId = crypto.randomUUID();
        await db.run(`
          INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
          VALUES (?, ?, ?, ?, ?)
        `, [mediaId, businessId, publicUrl, file.mimetype, docType]);
      }
    }

    // Handle gallery URLs from JSON body (if not already uploaded via files)
    if (galleryUrls.length > 0 && (!req.files?.gallery || req.files.gallery.length === 0)) {
      for (const url of galleryUrls) {
        if (url && typeof url === 'string') {
          const mediaId = crypto.randomUUID();
          await db.run(`
            INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
            VALUES (?, ?, ?, ?, ?)
          `, [mediaId, businessId, url, 'image', 'gallery']);
        }
      }
    }

    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    
    // Get all media for this business
    const allMedia = await db.all('SELECT * FROM business_media WHERE business_id = ?', [businessId]);
    
    res.json({ ok: true, business, media: allMedia });
  } catch (error) {
    console.error('[business/upsert] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/business/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const business = await db.get('SELECT * FROM businesses WHERE owner_id = ?', [userId]);
    
    if (!business) {
      // Return JSON, never HTML
      return res.json({ ok: true, business: null, media: [] });
    }

    // Get all media for this business
    const media = await db.all('SELECT * FROM business_media WHERE business_id = ? ORDER BY created_at DESC', [business.id]);

    // Always return JSON
    res.json({ ok: true, business, media });
  } catch (error) {
    console.error('[business/me] Error:', error);
    // Always return JSON
    res.json({ ok: true, business: null, media: [] });
  }
});

// Safe trim helper for backend - handles all value types
const safeTrim = (v) => {
  try {
    if (v == null || v === undefined) return null;
    
    // Handle strings
    if (typeof v === 'string') {
      const trimmed = v.trim();
      return trimmed !== '' ? trimmed : null;
    }
    
    // Handle numbers and booleans
    if (typeof v === 'number' || typeof v === 'boolean') {
      const strVal = String(v);
      if (typeof strVal === 'string') {
        const trimmed = strVal.trim();
        return trimmed !== '' ? trimmed : null;
      }
      return null;
    }
    
    // Handle arrays
    if (Array.isArray(v)) {
      return null;
    }
    
    // Handle objects
    if (typeof v === 'object') {
      // Try to extract a meaningful string value
      const objValue = v.name || v.value || v.label || null;
      if (objValue != null) {
        // Recursively call safeTrim on the extracted value
        return safeTrim(objValue);
      }
      return null;
    }
    
    // Final fallback - convert to string and trim safely
    const strVal = String(v);
    if (typeof strVal === 'string' && typeof strVal.trim === 'function') {
      const trimmed = strVal.trim();
      return trimmed !== '' ? trimmed : null;
    }
    return null;
  } catch (e) {
    console.error('[businesses/me] Error in safeTrim for value:', v, 'Error:', e);
    return null;
  }
};

// PUT /api/businesses/me - Update business with FormData support
// Also handle POST for compatibility (some clients don't support PUT)
const handleBusinessUpdate = async (req, res) => {
  console.log('[businesses/me] Route hit!', req.method, req.path, req.url);
  
  // Handle multer errors gracefully
  if (req.fileValidationError) {
    return res.status(400).json({ ok: false, error: req.fileValidationError });
  }
  
  try {
    const userId = req.user.id;
    
    // Multer parses FormData: files go to req.files (array when using .any()), text fields go to req.body
    const businessData = req.body || {};
    const files = req.files || [];
    
    // Organize files by field name for easier access
    const filesByField = {};
    files.forEach(file => {
      if (!filesByField[file.fieldname]) {
        filesByField[file.fieldname] = [];
      }
      filesByField[file.fieldname].push(file);
    });
    
    console.log('[businesses/me] Files received:', files.length, 'files');
    console.log('[businesses/me] Files by field:', Object.keys(filesByField));
    console.log('[businesses/me] Body fields:', Object.keys(businessData));
    console.log('[businesses/me PUT] User ID:', userId);
    console.log('[businesses/me PUT] Body keys:', Object.keys(businessData));
    console.log('[businesses/me PUT] Files by field:', Object.keys(filesByField));
    
    // Log all form fields to debug (safely)
    const safeLogValue = (val) => {
      try {
        if (val == null) return '(null/undefined)';
        if (typeof val === 'string') return val || '(empty string)';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      } catch (e) {
        return '(error logging value)';
      }
    };
    
    const safeLength = (val) => {
      try {
        if (typeof val === 'string') return val.length;
        return 'unknown';
      } catch (e) {
        return 'error';
      }
    };
    
    console.log('[businesses/me PUT] Form data received:', {
      name: safeLogValue(businessData.name),
      business_name: safeLogValue(businessData.business_name),
      phone: safeLogValue(businessData.phone),
      whatsapp: safeLogValue(businessData.whatsapp),
      website: safeLogValue(businessData.website),
      instagram: safeLogValue(businessData.instagram),
      city: safeLogValue(businessData.city),
      area: safeLogValue(businessData.area),
      block: safeLogValue(businessData.block),
      street: safeLogValue(businessData.street),
      floor: safeLogValue(businessData.floor),
      office_no: safeLogValue(businessData.office_no),
      industry: safeLogValue(businessData.industry),
      description: businessData.description ? 'Yes (' + safeLength(businessData.description) + ' chars)' : 'No',
      story: businessData.story ? 'Yes (' + safeLength(businessData.story) + ' chars)' : 'No'
    });
    
    // Check if business exists
    const existing = await db.get('SELECT id FROM businesses WHERE owner_id = ?', [userId]);
    
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }
    
    const businessId = existing.id;
    const now = new Date().toISOString();
    
    // Handle file uploads
    // NEVER save blob URLs - filter them out
    let logoUrl = null;
    if (businessData.logo_url && !businessData.logo_url.startsWith('blob:')) {
      logoUrl = businessData.logo_url; // Keep existing valid URL if no new upload
    }
    
    // Upload logo if provided
    const logoFilesArray = filesByField.logo || [];
    if (logoFilesArray.length > 0) {
      const logoFile = logoFilesArray[0];
      logoUrl = getPublicUrl(logoFile.path);
      console.log('[businesses/me] Logo uploaded:', logoUrl);
    }
    
    // Upload gallery images if provided
    // Support both 'gallery' and 'gallery[]' field names
    // NEVER save blob URLs - only save real uploaded files
    const galleryUrls = [];
    const galleryFiles = filesByField['gallery[]'] || filesByField.gallery || [];
    if (galleryFiles.length > 0) {
      for (const file of galleryFiles) {
        const publicUrl = getPublicUrl(file.path);
        // Only add if it's a real URL, not a blob URL
        if (!publicUrl.startsWith('blob:')) {
          galleryUrls.push(publicUrl);
          console.log('[businesses/me] Gallery image uploaded:', publicUrl);
        }
      }
    }
    
    // Filter out any blob URLs that might have been passed in the body
    if (businessData.gallery_urls && Array.isArray(businessData.gallery_urls)) {
      const validUrls = businessData.gallery_urls.filter(url => url && !url.startsWith('blob:'));
      galleryUrls.push(...validUrls);
    }
    
    // Update business - NEVER save blob URLs
    // Only update logo_url if we have a valid non-blob URL
    const logoUrlToSave = logoUrl && !logoUrl.startsWith('blob:') ? logoUrl : null;
    
    // Prepare update values - use safeTrim for all fields
    const updateValues = {
      name: safeTrim(businessData.name || businessData.business_name),
      business_name: safeTrim(businessData.business_name || businessData.name),
      description: safeTrim(businessData.description),
      story: safeTrim(businessData.story),
      industry: safeTrim(businessData.industry),
      category: safeTrim(businessData.category),
      country: safeTrim(businessData.country) || 'Kuwait', // Default to Kuwait if empty
      city: safeTrim(businessData.city),
      area: safeTrim(businessData.area),
      block: safeTrim(businessData.block),
      street: safeTrim(businessData.street),
      floor: safeTrim(businessData.floor),
      office_no: safeTrim(businessData.office_no),
      phone: safeTrim(businessData.phone),
      whatsapp: safeTrim(businessData.whatsapp),
      website: safeTrim(businessData.website),
      instagram: safeTrim(businessData.instagram)
    };
    
    console.log('[businesses/me] Update values:', updateValues);
    
    // Build UPDATE query with proper parameter binding
    await db.run(`
      UPDATE businesses SET
        name = COALESCE(?, name),
        business_name = COALESCE(?, business_name),
        description = COALESCE(?, description),
        story = COALESCE(?, story),
        industry = COALESCE(?, industry),
        category = COALESCE(?, category),
        country = COALESCE(?, country),
        city = COALESCE(?, city),
        area = COALESCE(?, area),
        block = COALESCE(?, block),
        street = COALESCE(?, street),
        floor = COALESCE(?, floor),
        office_no = COALESCE(?, office_no),
        phone = COALESCE(?, phone),
        whatsapp = COALESCE(?, whatsapp),
        website = COALESCE(?, website),
        instagram = COALESCE(?, instagram),
        logo_url = CASE WHEN ? IS NOT NULL AND ? NOT LIKE 'blob:%' THEN ? ELSE logo_url END,
        updated_at = ?
      WHERE owner_id = ?
    `, [
      updateValues.name,
      updateValues.business_name,
      updateValues.description,
      updateValues.story,
      updateValues.industry,
      updateValues.category,
      updateValues.country,
      updateValues.city,
      updateValues.area,
      updateValues.block,
      updateValues.street,
      updateValues.floor,
      updateValues.office_no,
      updateValues.phone,
      updateValues.whatsapp,
      updateValues.website,
      updateValues.instagram,
      logoUrlToSave,  // Parameter 19
      logoUrlToSave,  // Parameter 20
      logoUrlToSave,  // Parameter 21
      now,            // Parameter 22
      userId          // Parameter 23
    ]);
    
    console.log('[businesses/me] Business updated successfully');
    
    // Save logo to business_media if uploaded
    // NEVER save blob URLs - only save real uploaded files
    const logoFilesForMedia = filesByField.logo || [];
    if (logoUrl && !logoUrl.startsWith('blob:') && logoFilesForMedia.length > 0) {
      // Delete old logo media
      await db.run('DELETE FROM business_media WHERE business_id = ? AND document_type = ?', [businessId, 'logo']);
      
      const mediaId = crypto.randomUUID();
      await db.run(`
        INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
        VALUES (?, ?, ?, ?, ?)
      `, [mediaId, businessId, logoUrl, logoFilesForMedia[0].mimetype, 'logo']);
      console.log('[businesses/me] Logo saved to business_media:', logoUrl);
    }
    
    // Save gallery images to business_media
    // Filter out any blob URLs before saving
    const validGalleryUrls = galleryUrls.filter(url => url && !url.startsWith('blob:'));
    if (validGalleryUrls.length > 0) {
      for (const url of validGalleryUrls) {
        const mediaId = crypto.randomUUID();
        await db.run(`
          INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
          VALUES (?, ?, ?, ?, ?)
        `, [mediaId, businessId, url, 'image', 'gallery']);
        console.log('[businesses/me] Gallery image saved to business_media:', url);
      }
    }
    
    // Handle document uploads (license, iban, articles, signature_auth, civil_id_front, civil_id_back, owner_proof)
    const documentTypes = ['license', 'iban', 'articles', 'signature_auth', 'civil_id_front', 'civil_id_back', 'owner_proof'];
    let documentsSaved = 0;
    for (const docType of documentTypes) {
      const docFiles = filesByField[docType] || [];
      if (docFiles.length > 0) {
        const file = docFiles[0];
        const publicUrl = getPublicUrl(file.path);
        
        // Delete old document of this type
        await db.run('DELETE FROM business_media WHERE business_id = ? AND document_type = ?', [businessId, docType]);
        
        // Insert new document
        const mediaId = crypto.randomUUID();
        await db.run(`
          INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
          VALUES (?, ?, ?, ?, ?)
        `, [mediaId, businessId, publicUrl, file.mimetype, docType]);
        console.log(`[businesses/me] ✅ Document ${docType} saved to business_media:`, publicUrl);
        documentsSaved++;
      } else {
        console.log(`[businesses/me] ⏭️ No file uploaded for document type: ${docType}`);
      }
    }
    console.log(`[businesses/me] 📄 Total documents saved: ${documentsSaved} out of ${documentTypes.length} types`);
    
    // Get updated business
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    const media = await db.all('SELECT * FROM business_media WHERE business_id = ? ORDER BY created_at DESC', [businessId]);
    
    res.json({ ok: true, business, media });
  } catch (error) {
    console.error('[businesses/me] Error:', error);
    console.error('[businesses/me] Error name:', error?.name);
    console.error('[businesses/me] Error message:', error?.message);
    console.error('[businesses/me] Error stack:', error?.stack);
    console.error('[businesses/me] Request body keys:', Object.keys(businessData || {}));
    console.error('[businesses/me] Request body sample:', JSON.stringify(businessData, null, 2).substring(0, 500));
    
    // Ensure error message is always a string
    let errorMessage = 'Internal server error';
    try {
      if (error?.message) {
        errorMessage = String(error.message);
      } else if (error) {
        errorMessage = String(error);
      }
    } catch (e) {
      errorMessage = 'Internal server error (failed to parse error message)';
    }
    
    res.status(500).json({ ok: false, error: errorMessage });
  }
};

// Create a more permissive upload handler for /me route that accepts any file fields
// This allows document uploads without needing to list every possible field name
const uploadAny = upload.any();

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('[businesses/me] Multer error:', err.message, err.code);
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        ok: false, 
        error: `Unexpected file field: ${err.field || 'unknown'}. All file fields are accepted, but there may be a configuration issue.` 
      });
    }
    return res.status(400).json({ ok: false, error: err.message || 'File upload error' });
  }
  next();
};

// Register both PUT and POST handlers
// Note: uploadAny (multer) parses both files AND text fields into req.body
// Files are in req.files as an array when using .any()
router.put('/me', requireAuth, uploadAny, handleMulterError, handleBusinessUpdate);
router.post('/me', requireAuth, uploadAny, handleMulterError, handleBusinessUpdate);

// GET /api/businesses/public - Get all approved/published businesses for directory
// MUST be before /:id route to avoid matching 'public' as an ID
router.get('/public', async (req, res) => {
  try {
    // Show businesses that are approved OR pending (for now, to allow testing)
    // In production, you might want to only show 'approved'
    const businesses = await db.all(`
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM business_media WHERE business_id = b.id) as media_count
      FROM businesses b
      WHERE b.is_active = 1 AND (b.status = 'approved' OR b.status = 'pending')
      ORDER BY b.created_at DESC
    `);
    
    console.log(`[businesses/public] Found ${businesses?.length || 0} businesses (approved or pending)`);
    
    res.json({ ok: true, businesses: businesses || [] });
  } catch (error) {
    console.error('[businesses/public] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// PUT /api/businesses/:id/admin - Update business status (admin only, no auth required for localhost admin dashboard)
// IMPORTANT: This route must come BEFORE PUT /:id to avoid route conflicts
console.log('[business.routes] ✅ Registering PUT /:id/admin route');
router.put('/:id/admin', async (req, res) => {
  try {
    const businessId = req.params.id;
    const { status, is_active } = req.body;
    
    console.log(`[businesses PUT /:id/admin] Admin update request:`, {
      businessId,
      status,
      is_active,
      ip: req.ip,
      hostname: req.hostname
    });
    
    // Check if business exists
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) {
      console.log(`[businesses PUT /:id/admin] Business not found: ${businessId}`);
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }

    console.log(`[businesses PUT /:id/admin] Current business status:`, {
      id: business.id,
      name: business.name || business.business_name,
      currentStatus: business.status,
      currentIsActive: business.is_active
    });

    // Update business status
    const updates = [];
    const values = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      console.log(`[businesses PUT /:id/admin] Will update status to: ${status}`);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      console.log(`[businesses PUT /:id/admin] Will update is_active to: ${is_active ? 1 : 0}`);
    }
    
    if (updates.length === 0) {
      console.log(`[businesses PUT /:id/admin] No updates provided`);
      return res.status(400).json({ ok: false, error: 'No updates provided' });
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(businessId);
    
    const updateQuery = `UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`;
    console.log(`[businesses PUT /:id/admin] Executing update query:`, updateQuery, 'with values:', values);
    
    await db.run(updateQuery, values);
    console.log(`[businesses PUT /:id/admin] Update query executed successfully`);
    
    // Get updated business
    const updatedBusiness = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    console.log(`[businesses PUT /:id/admin] Updated business status:`, {
      id: updatedBusiness.id,
      status: updatedBusiness.status,
      is_active: updatedBusiness.is_active
    });
    
    res.json({ ok: true, business: updatedBusiness });
  } catch (error) {
    console.error('[businesses PUT /:id/admin] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// DELETE /api/businesses/:id/admin - Complete account deletion (admin only, no auth required)
// IMPORTANT: This route must come BEFORE DELETE /:id to avoid route conflicts
console.log('[business.routes] ✅ Registering DELETE /:id/admin route');
router.delete('/:id/admin', async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log(`[businesses DELETE /:id/admin] Admin deletion request:`, {
      businessId,
      ip: req.ip,
      hostname: req.hostname
    });
    
    // Check if business exists
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) {
      console.log(`[businesses DELETE /:id/admin] Business not found: ${businessId}`);
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }

    const ownerId = business.owner_id;
    console.log(`[businesses DELETE /:id/admin] Found business: ${business.name || business.business_name} (owner: ${ownerId})`);
    console.log(`[businesses DELETE /:id/admin] Starting complete deletion of account and all related data...`);

    // 1. Delete event registrations (cascades from events, but delete explicitly for clarity)
    const eventRegResult = await db.run(`
      DELETE FROM event_registrations 
      WHERE event_id IN (SELECT id FROM events WHERE owner_id = ? OR business_id = ?)
    `, [ownerId, businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${eventRegResult.changes || 0} event registrations`);

    // 2. Delete bulletin registrations (cascades from bulletins, but delete explicitly)
    const bulletinRegResult = await db.run(`
      DELETE FROM bulletin_registrations 
      WHERE bulletin_id IN (SELECT id FROM bulletins WHERE owner_id = ? OR business_id = ?)
    `, [ownerId, businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${bulletinRegResult.changes || 0} bulletin registrations`);

    // 3. Delete events (cascades from owner_id, but also check business_id)
    const eventsResult = await db.run('DELETE FROM events WHERE owner_id = ? OR business_id = ?', [ownerId, businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${eventsResult.changes || 0} events`);

    // 4. Delete bulletins (cascades from owner_id, but also check business_id)
    const bulletinsResult = await db.run('DELETE FROM bulletins WHERE owner_id = ? OR business_id = ?', [ownerId, businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${bulletinsResult.changes || 0} bulletins`);

    // 5. Delete messages (cascades from conversations and sender_id)
    const messagesResult = await db.run(`
      DELETE FROM messages 
      WHERE sender_id = ? OR conversation_id IN (
        SELECT id FROM conversations WHERE participant1_id = ? OR participant2_id = ?
      )
    `, [ownerId, ownerId, ownerId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${messagesResult.changes || 0} messages`);

    // 6. Delete conversations (cascades from participant IDs)
    const conversationsResult = await db.run('DELETE FROM conversations WHERE participant1_id = ? OR participant2_id = ?', [ownerId, ownerId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${conversationsResult.changes || 0} conversations`);

    // 7. Delete business media/files
    const mediaResult = await db.run('DELETE FROM business_media WHERE business_id = ?', [businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted ${mediaResult.changes || 0} media items`);

    // 8. Delete business
    const businessResult = await db.run('DELETE FROM businesses WHERE id = ?', [businessId]);
    console.log(`[businesses DELETE /:id/admin] Deleted business (${businessResult.changes || 0} rows)`);

    // 9. Delete user account
    const userResult = await db.run('DELETE FROM users WHERE id = ?', [ownerId]);
    console.log(`[businesses DELETE /:id/admin] Deleted user account (${userResult.changes || 0} rows)`);

    // 10. Delete uploaded files from filesystem
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads', ownerId);
    try {
      if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        console.log(`[businesses DELETE /:id/admin] Deleted upload directory: ${uploadsDir}`);
      }
    } catch (fsError) {
      console.warn(`[businesses DELETE /:id/admin] Could not delete upload directory:`, fsError.message);
    }

    console.log(`[businesses DELETE /:id/admin] ✅ Complete deletion successful for account ${ownerId}`);
    
    res.json({ 
      ok: true, 
      message: 'Account and all related data deleted successfully',
      deletedId: businessId,
      ownerId: ownerId,
      deleted: {
        events: eventsResult.changes || 0,
        bulletins: bulletinsResult.changes || 0,
        messages: messagesResult.changes || 0,
        conversations: conversationsResult.changes || 0,
        media: mediaResult.changes || 0,
        business: businessResult.changes || 0,
        user: userResult.changes || 0
      }
    });
  } catch (error) {
    console.error('[businesses DELETE /:id/admin] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// DELETE /api/businesses/:id - Delete business (requires auth)
// IMPORTANT: This route must come BEFORE GET /:id to avoid route conflicts
console.log('[business.routes] ✅ Registering DELETE /:id route');
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    console.log(`[businesses DELETE /:id] Route hit! Method: ${req.method}, Path: ${req.path}, URL: ${req.url}, Params:`, req.params);
    const businessId = req.params.id;
    console.log(`[businesses DELETE /:id] Attempting to delete business: ${businessId}`);
    
    // Check if business exists
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) {
      console.log(`[businesses DELETE /:id] Business not found: ${businessId}`);
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }

    console.log(`[businesses DELETE /:id] Found business: ${business.name || business.business_name} (owner: ${business.owner_id})`);

    // Delete associated media/files
    const mediaResult = await db.run('DELETE FROM business_media WHERE business_id = ?', [businessId]);
    console.log(`[businesses DELETE /:id] Deleted ${mediaResult.changes || 0} media items for business ${businessId}`);

    // Delete business
    const businessResult = await db.run('DELETE FROM businesses WHERE id = ?', [businessId]);
    console.log(`[businesses DELETE /:id] Deleted business ${businessId} (${businessResult.changes || 0} rows affected)`);
    
    res.json({ ok: true, message: 'Business deleted successfully', deletedId: businessId });
  } catch (error) {
    console.error('[businesses DELETE /:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/businesses/:id - Get single business by ID
// MUST be after /public route to avoid matching 'public' as an ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[businesses/:id] Fetching business with ID:', id);
    const business = await db.get(`
      SELECT * FROM businesses WHERE id = ?
    `, [id]);
    
    if (!business) {
      console.log('[businesses/:id] Business not found:', id);
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }
    
    // Get all media for this business
    const media = await db.all('SELECT * FROM business_media WHERE business_id = ? ORDER BY created_at DESC', [business.id]);
    
    console.log('[businesses/:id] Business found:', business.name || business.business_name, 'with', media.length, 'media items');
    res.json({ ok: true, business, media });
  } catch (error) {
    console.error('[businesses/:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// Debug: Test route to verify PUT is working
router.put('/test', (req, res) => {
  console.log('[businesses/test PUT] Route hit!', req.method, req.path);
  res.json({ ok: true, message: 'PUT route is working', method: req.method });
});

// PUT /api/businesses/:id - Update business status (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const businessId = req.params.id;
    const { status, is_active } = req.body;
    
    console.log(`[businesses PUT /:id] Update request:`, {
      businessId,
      status,
      is_active,
      userId: req.user?.id
    });
    
    // Check if business exists
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) {
      console.log(`[businesses PUT /:id] Business not found: ${businessId}`);
      return res.status(404).json({ ok: false, error: 'Business not found' });
    }

    console.log(`[businesses PUT /:id] Current business status:`, {
      id: business.id,
      name: business.name || business.business_name,
      currentStatus: business.status,
      currentIsActive: business.is_active
    });

    // Update business status
    const updates = [];
    const values = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      console.log(`[businesses PUT /:id] Will update status to: ${status}`);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      console.log(`[businesses PUT /:id] Will update is_active to: ${is_active ? 1 : 0}`);
    }
    
    if (updates.length === 0) {
      console.log(`[businesses PUT /:id] No updates provided`);
      return res.status(400).json({ ok: false, error: 'No updates provided' });
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(businessId);
    
    const updateQuery = `UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`;
    console.log(`[businesses PUT /:id] Executing update query:`, updateQuery, 'with values:', values);
    
    await db.run(updateQuery, values);
    console.log(`[businesses PUT /:id] Update query executed successfully`);
    
    // Get updated business
    const updatedBusiness = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    console.log(`[businesses PUT /:id] Updated business status:`, {
      id: updatedBusiness.id,
      status: updatedBusiness.status,
      is_active: updatedBusiness.is_active
    });
    
    res.json({ ok: true, business: updatedBusiness });
  } catch (error) {
    console.error('[businesses PUT /:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;

