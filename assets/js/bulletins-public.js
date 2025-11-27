// assets/js/bulletins-public.js - Using localStorage instead of API

export async function loadPublicBulletins(limit = 12) {
  try {
    console.log('[bulletins-public] Loading bulletins...');
    
    // Load bulletins from localStorage
    const { getPublicBulletins } = await import('/js/api.js');
    const bulletins = await getPublicBulletins();
    
    // Transform and filter out fake/incomplete bulletins
    const filtered = (Array.isArray(bulletins) ? bulletins : [])
      .filter(b => {
        // Check for valid title and body
        if (!b.title || !b.body) return false;
        const title = b.title.trim();
        const body = b.body.trim();
        if (!title || !body) return false;
        
        // Filter out test/fake bulletins
        const titleLower = title.toLowerCase();
        if (titleLower.includes('test') || 
            titleLower.includes('fake') || 
            titleLower.includes('dummy') ||
            titleLower.includes('sample')) {
          return false;
        }
        
        // Require minimum length for meaningful content
        if (title.length < 3 || body.length < 10) return false;
        
        return true;
      })
      .map(b => ({
        id: b.id,
        title: b.title,
        description: b.body,
        business_name: b.business_name || 'Business',
        business_logo_url: b.business_logo_url,
        cover_image_url: b.cover_image_url,
        location: b.location || '',
        created_at: b.created_at,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email
      }))
      .slice(0, limit);
    
    console.log('[bulletins-public] Loaded', filtered.length, 'valid bulletins');
    return {
      current: filtered,
      error: null
    };
  } catch (error) {
    console.error('[bulletins-public] Exception:', error);
    return { current: [], error };
  }
}
