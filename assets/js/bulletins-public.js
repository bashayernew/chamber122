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
        // Check for valid title and body/content
        if (!b.title) return false;
        const title = b.title.trim();
        if (!title) return false;
        
        // Check for body, content, or description
        const body = (b.body || b.content || b.description || '').trim();
        if (!body) return false;
        
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
        description: b.body || b.content || b.description || '',
        body: b.body || b.content || b.description || '',
        business_name: b.business_name || 'Business',
        business_logo_url: b.business_logo_url,
        cover_image_url: b.cover_image_url || b.cover_url || b.image_url || '',
        location: b.location || '',
        created_at: b.created_at,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email,
        start_at: b.start_at || b.start_date || b.publish_at,
        end_at: b.end_at || b.deadline_date || b.end_date || b.expire_at,
        category: b.category || b.type || ''
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
