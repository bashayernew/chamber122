// Use global Supabase client
import { requireSession } from './auth-signup-utils.js';

const getSupabase = () => {
  const client = window.__supabase || window.__supabaseClient;
  if (!client) {
    throw new Error('Supabase client not initialized. Make sure supabase-client.global.js is loaded first.');
  }
  return client;
};

export async function createBusinessRecord(fields) {
  const user = await requireSession(); // must be logged in
  const supabase = getSupabase();
  
  // Upload logo if provided
  let logoUrl = fields.logo_url || null;
  if (fields.logo_file && !logoUrl) {
    try {
      // Upload logo to Supabase storage
      const file = fields.logo_file;
      const ext = file.name?.split('.').pop() || 'jpg';
      const logoPath = `${user.id}/logo/${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-files')
        .upload(logoPath, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || 'image/jpeg'
        });
      
      if (!uploadError && uploadData) {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('business-files')
          .getPublicUrl(logoPath);
        logoUrl = urlData?.publicUrl || null;
        console.log('[businesses-utils] Logo uploaded:', logoUrl);
      } else {
        console.error('[businesses-utils] Logo upload error:', uploadError);
      }
    } catch (err) {
      console.error('[businesses-utils] Error uploading logo:', err);
    }
  }
  
  const payload = {
    owner_id: user.id, // Use owner_id (not owner_user_id) to match businesses table
    name: fields.business_name ?? '', // Use name (not business_name) to match businesses table
    industry: fields.industry ?? null,
    category: fields.industry ?? null, // Also set category for compatibility
    country: fields.country ?? null,
    city: fields.city ?? null,
    area: fields.area ?? null,
    block: fields.block ?? null,
    street: fields.street ?? null,
    floor: fields.floor ?? null,
    office_no: fields.office_no ?? null,
    description: fields.description ?? null,
    short_description: fields.short_description ?? fields.description ?? null,
    story: fields.story ?? null,
    phone: fields.phone ?? null,
    whatsapp: fields.whatsapp ?? null,
    website: fields.website ?? null,
    instagram: fields.instagram ?? null,
    logo_url: logoUrl,
    is_active: true
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
    gallery_files: fields.gallery_files?.length || 0
  });

  // Insert and return all fields to verify what was saved
  const supabaseClient = getSupabase();
  const { data, error } = await supabaseClient
    .from('businesses')
    .insert(payload)
    .select('id, name, owner_id, industry, category, country, city, area, block, street, floor, office_no, description, short_description, story, phone, whatsapp, website, instagram, logo_url, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('[businesses-utils] Error creating business:', error);
    throw error;
  }
  
  console.log('[businesses-utils] Business created successfully:', {
    id: data.id,
    name: data.name,
    has_description: !!data.description,
    description: data.description?.substring(0, 50) || 'NULL',
    has_story: !!data.story,
    story: data.story?.substring(0, 50) || 'NULL',
    city: data.city || 'NULL',
    area: data.area || 'NULL',
    phone: data.phone || 'NULL',
    whatsapp: data.whatsapp || 'NULL',
    website: data.website || 'NULL',
    instagram: data.instagram || 'NULL',
    has_logo: !!data.logo_url,
    logo_url: data.logo_url || 'NULL'
  });

  // Upload gallery images if provided
  const businessId = data.id;
  if (fields.gallery_files && fields.gallery_files.length > 0 && businessId) {
    try {
      console.log('[businesses-utils] Uploading', fields.gallery_files.length, 'gallery images...');
      const supabaseClient = getSupabase();
      
      for (const file of fields.gallery_files) {
        const ext = file.name?.split('.').pop() || 'jpg';
        const galleryPath = `${businessId}/gallery/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('business-media')
          .upload(galleryPath, file, {
            upsert: false,
            cacheControl: '3600',
            contentType: file.type || 'image/jpeg'
          });
        
        if (!uploadError && uploadData) {
          // Get public URL
          const { data: urlData } = supabaseClient.storage
            .from('business-media')
            .getPublicUrl(galleryPath);
          
          // Insert into business_media table
          await supabaseClient
            .from('business_media')
            .insert({
              business_id: businessId,
              file_path: galleryPath,
              file_url: urlData?.publicUrl || null,
              media_type: 'image',
              display_order: 0
            });
          
          console.log('[businesses-utils] Gallery image uploaded:', urlData?.publicUrl);
        } else {
          console.error('[businesses-utils] Gallery upload error:', uploadError);
        }
      }
    } catch (err) {
      console.error('[businesses-utils] Error uploading gallery images:', err);
      // Don't throw - gallery upload failure shouldn't break signup
    }
  }

  return data;
}




        .upload(logoPath, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || 'image/jpeg'
        });
      
      if (!uploadError && uploadData) {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('business-files')
          .getPublicUrl(logoPath);
        logoUrl = urlData?.publicUrl || null;
        console.log('[businesses-utils] Logo uploaded:', logoUrl);
      } else {
        console.error('[businesses-utils] Logo upload error:', uploadError);
      }
    } catch (err) {
      console.error('[businesses-utils] Error uploading logo:', err);
    }
  }
  
  const payload = {
    owner_id: user.id, // Use owner_id (not owner_user_id) to match businesses table
    name: fields.business_name ?? '', // Use name (not business_name) to match businesses table
    industry: fields.industry ?? null,
    category: fields.industry ?? null, // Also set category for compatibility
    country: fields.country ?? null,
    city: fields.city ?? null,
    area: fields.area ?? null,
    block: fields.block ?? null,
    street: fields.street ?? null,
    floor: fields.floor ?? null,
    office_no: fields.office_no ?? null,
    description: fields.description ?? null,
    short_description: fields.short_description ?? fields.description ?? null,
    story: fields.story ?? null,
    phone: fields.phone ?? null,
    whatsapp: fields.whatsapp ?? null,
    website: fields.website ?? null,
    instagram: fields.instagram ?? null,
    logo_url: logoUrl,
    is_active: true
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
    gallery_files: fields.gallery_files?.length || 0
  });

  // Insert and return all fields to verify what was saved
  const supabaseClient = getSupabase();
  const { data, error } = await supabaseClient
    .from('businesses')
    .insert(payload)
    .select('id, name, owner_id, industry, category, country, city, area, block, street, floor, office_no, description, short_description, story, phone, whatsapp, website, instagram, logo_url, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('[businesses-utils] Error creating business:', error);
    throw error;
  }
  
  console.log('[businesses-utils] Business created successfully:', {
    id: data.id,
    name: data.name,
    has_description: !!data.description,
    description: data.description?.substring(0, 50) || 'NULL',
    has_story: !!data.story,
    story: data.story?.substring(0, 50) || 'NULL',
    city: data.city || 'NULL',
    area: data.area || 'NULL',
    phone: data.phone || 'NULL',
    whatsapp: data.whatsapp || 'NULL',
    website: data.website || 'NULL',
    instagram: data.instagram || 'NULL',
    has_logo: !!data.logo_url,
    logo_url: data.logo_url || 'NULL'
  });

  // Upload gallery images if provided
  const businessId = data.id;
  if (fields.gallery_files && fields.gallery_files.length > 0 && businessId) {
    try {
      console.log('[businesses-utils] Uploading', fields.gallery_files.length, 'gallery images...');
      const supabaseClient = getSupabase();
      
      for (const file of fields.gallery_files) {
        const ext = file.name?.split('.').pop() || 'jpg';
        const galleryPath = `${businessId}/gallery/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('business-media')
          .upload(galleryPath, file, {
            upsert: false,
            cacheControl: '3600',
            contentType: file.type || 'image/jpeg'
          });
        
        if (!uploadError && uploadData) {
          // Get public URL
          const { data: urlData } = supabaseClient.storage
            .from('business-media')
            .getPublicUrl(galleryPath);
          
          // Insert into business_media table
          await supabaseClient
            .from('business_media')
            .insert({
              business_id: businessId,
              file_path: galleryPath,
              file_url: urlData?.publicUrl || null,
              media_type: 'image',
              display_order: 0
            });
          
          console.log('[businesses-utils] Gallery image uploaded:', urlData?.publicUrl);
        } else {
          console.error('[businesses-utils] Gallery upload error:', uploadError);
        }
      }
    } catch (err) {
      console.error('[businesses-utils] Error uploading gallery images:', err);
      // Don't throw - gallery upload failure shouldn't break signup
    }
  }

  return data;
}



