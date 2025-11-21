import { supabase } from './supabase-client.global.js';

export async function loadPublicBulletins(limit = 12) {
  try {
    console.log('[bulletins-public] Loading bulletins...');
    
    const current = await supabase
      .from('bulletins')
      .select('id,title,body,business_id,cover_url,created_at,contact_phone,contact_email,governorate,area,street,block,floor,businesses(id,name,logo_url)')
      .eq('status', 'published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (current.error) {
      console.error('[bulletins-public] Error:', current.error);
      return { current: [], error: current.error };
    }
    
    // Transform and filter out fake/incomplete bulletins
    const filtered = (current.data || [])
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
        
        // Must have a valid business_id
        if (!b.business_id) return false;
        
        return true;
      })
      .map(b => ({
        id: b.id,
        title: b.title,
        description: b.body,
        business_name: b.businesses?.name || 'Business',
        business_logo_url: b.businesses?.logo_url,
        cover_image_url: b.cover_url,
        location: [b.governorate, b.area, b.street, b.block, b.floor].filter(Boolean).join(', '),
        created_at: b.created_at,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email
      }));
    
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

        id: b.id,
        title: b.title,
        description: b.body,
        business_name: b.businesses?.name || 'Business',
        business_logo_url: b.businesses?.logo_url,
        cover_image_url: b.cover_url,
        location: [b.governorate, b.area, b.street, b.block, b.floor].filter(Boolean).join(', '),
        created_at: b.created_at,
        contact_phone: b.contact_phone,
        contact_email: b.contact_email
      }));
    
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
