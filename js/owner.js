// js/owner.js - Load and display business data using localStorage only (no backend, no API)
import { getCurrentUser, getBusinessByOwner, getBusinessById, getAllBusinesses } from './auth-localstorage.js';

console.log('[owner] Loading business display script');

async function loadAndDisplayBusiness(businessId = null) {
  console.log('[owner] Loading business data...', businessId ? `for business ID: ${businessId}` : 'for current user');
  
  try {
    let business = null;
    
    // If businessId is provided, load that business (for viewing other businesses)
    if (businessId) {
      console.log('[owner] Loading business by ID:', businessId);
      business = getBusinessById(businessId);
      if (!business) {
        alert('Business not found');
        window.location.href = '/directory.html';
        return;
      }
    } else {
      // Otherwise, load current user's business
      const user = getCurrentUser();
      if (!user) {
        console.log('[owner] No user, redirecting to auth');
        location.href = '/auth.html';
        return;
      }
      
      console.log('[owner] User ID:', user.id);
      
      // Load business data from localStorage
      business = getBusinessByOwner(user.id);
      
      if (!business) {
        console.log('[owner] No business found for user:', user.id);
        console.log('[owner] All businesses in localStorage:', getAllBusinesses().map(b => ({ id: b.id, owner_id: b.owner_id, name: b.name || b.business_name })));
        
        // Check if there's a business with a different owner_id format
        const allBusinesses = getAllBusinesses();
        const altBusiness = allBusinesses.find(b => 
          (b.owner_id === user.id) || 
          (b.user_id === user.id) ||
          (b.owner_user_id === user.id)
        );
        
        if (altBusiness) {
          console.log('[owner] Found business with alternative owner_id format:', altBusiness);
          business = altBusiness;
        } else {
          console.log('[owner] No business found - redirecting to form');
          if (confirm('No business profile found. Would you like to create one?')) {
            window.location.href = '/owner-form.html';
          }
          return;
        }
      }
    }
    
    if (!business) {
      console.error('[owner] No business data available');
      return;
    }
    
    console.log('[owner] Business loaded:', business.name || business.business_name);
    console.log('[owner] Business data from localStorage:', business);
    
    // Helper function for safe values
    const val = (x, fallback) => {
      fallback = fallback || '—';
      return (x && String(x).trim().length) ? x : fallback;
    };
    
    // Populate all fields (use correct IDs from HTML)
    const $ = (id) => document.getElementById(id);
    
    // Business name and info
    if ($('biz-name')) {
      $('biz-name').textContent = business.name || business.business_name || 'Your Business';
    }
    
    // Status badge - ensure it shows the correct status
    // Check user status directly from localStorage users array
    const statusBadge = $('status-badge');
    if (statusBadge) {
      let status = (business.status || 'pending').toLowerCase();
      
      // Check user status directly from users array
      try {
        const user = getCurrentUser();
        if (user && user.id) {
          const { getAllUsers } = await import('./auth-localstorage.js');
          const users = getAllUsers();
          const userData = users.find(u => u.id === user.id);
          if (userData && userData.status) {
            status = userData.status.toLowerCase();
            console.log('[owner] Using status from user data:', status);
          } else if (userData) {
            // Default to pending if no status
            status = 'pending';
          }
        }
      } catch (err) {
        console.debug('[owner] Could not check user status:', err);
      }
      
      // Set text content and styling based on status
      if (status === 'approved') {
        statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Approved';
        statusBadge.className = 'badge status-badge approved';
        statusBadge.style.background = '#10b981';
        statusBadge.style.color = '#fff';
      } else if (status === 'suspended') {
        statusBadge.innerHTML = '<i class="fas fa-ban"></i> Suspended';
        statusBadge.className = 'badge status-badge suspended';
        statusBadge.style.background = '#ef4444';
        statusBadge.style.color = '#fff';
      } else if (status === 'rejected') {
        statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Rejected';
        statusBadge.className = 'badge status-badge rejected';
        statusBadge.style.background = '#f59e0b';
        statusBadge.style.color = '#fff';
      } else {
        statusBadge.innerHTML = `<i class="fas fa-clock"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        statusBadge.className = `badge status-badge ${status}`;
        statusBadge.style.background = '#6b7280';
        statusBadge.style.color = '#fff';
      }
      console.log('[owner] Status badge set to:', status);
    }
    
    // Description and Story
    const descEl = $('description');
    if (descEl) {
      let descText = val(business.description || business.short_description, 'No description yet...');
      // Filter out placeholder/label text
      const invalidTexts = ['Describe what you offer', 'Business Description', 'Tell us about your business'];
      if (invalidTexts.some(text => descText.includes(text))) {
        descText = 'No description yet...';
      }
      descEl.textContent = descText;
      console.log('[owner] Setting description:', descText.substring(0, 50) + '...');
    }
    
    const storyEl = $('story');
    if (storyEl) {
      let storyText = val(business.story, 'No story yet...');
      // Filter out placeholder/label text
      const invalidTexts = ['Share your journey', 'Business Description', 'Tell us about your business', 'Why did you start this business'];
      if (invalidTexts.some(text => storyText.includes(text))) {
        storyText = 'No story yet...';
      }
      storyEl.textContent = storyText;
      console.log('[owner] Setting story:', storyText.substring(0, 50) + '...');
    }
    
    // Contact fields
    const phoneEl = $('phone');
    if (phoneEl) {
      const phoneVal = val(business.phone, 'Not provided');
      if (phoneEl.tagName === 'A') {
        phoneEl.textContent = phoneVal;
        phoneEl.href = business.phone ? `tel:${business.phone}` : '#';
      } else {
        phoneEl.textContent = phoneVal;
      }
    }
    
    const whatsappEl = $('whatsapp');
    if (whatsappEl) {
      const whatsappVal = val(business.whatsapp, 'Not provided');
      if (whatsappEl.tagName === 'A') {
        whatsappEl.textContent = whatsappVal;
        whatsappEl.href = business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}` : '#';
      } else {
        whatsappEl.textContent = whatsappVal;
      }
    }
    
    const websiteEl = $('website');
    if (websiteEl) {
      const websiteVal = val(business.website, 'Not provided');
      if (websiteEl.tagName === 'A') {
        websiteEl.textContent = websiteVal;
        websiteEl.href = business.website || '#';
      } else {
        websiteEl.textContent = websiteVal;
      }
    }
    
    const instagramEl = $('instagram');
    if (instagramEl) {
      const instagramVal = val(business.instagram, 'Not provided');
      if (instagramEl.tagName === 'A') {
        instagramEl.textContent = instagramVal;
        instagramEl.href = business.instagram ? `https://instagram.com/${business.instagram.replace(/^@/, '')}` : '#';
      } else {
        instagramEl.textContent = instagramVal;
      }
    }
    
    // Location fields
    const locationEl = $('location');
    if (locationEl) {
      const locationParts = [];
      if (business.area) locationParts.push(business.area);
      if (business.block) locationParts.push(`Block ${business.block}`);
      if (business.street) locationParts.push(business.street);
      if (business.floor) locationParts.push(`Floor ${business.floor}`);
      if (business.office_no) locationParts.push(`Office ${business.office_no}`);
      const locationText = locationParts.length > 0 ? locationParts.join(', ') : 'Not provided';
      locationEl.textContent = locationText;
    }
    
    // Logo - check multiple possible IDs and ensure it displays
    const logoEl = document.getElementById('biz-logo') || document.getElementById('logo') || $('logo');
    const logoUrl = business.logo_url || business.logo || null;
    console.log('[owner] Logo element found:', !!logoEl, 'Logo URL:', !!logoUrl);
    
    if (logoEl) {
      if (logoUrl && !logoUrl.startsWith('blob:')) {
        // Don't use blob URLs - they're temporary
        if (logoEl.tagName === 'IMG') {
          logoEl.src = logoUrl;
          logoEl.alt = business.name || business.business_name || 'Business logo';
          logoEl.style.display = 'block';
          logoEl.style.visibility = 'visible';
          logoEl.style.opacity = '1';
          logoEl.style.width = 'auto';
          logoEl.style.height = 'auto';
          logoEl.style.maxWidth = '200px';
          logoEl.style.maxHeight = '120px';
          logoEl.style.borderRadius = '8px';
          logoEl.style.objectFit = 'contain';
          console.log('[owner] Logo set on img element:', logoUrl.substring(0, 50) + '...');
        } else {
          logoEl.innerHTML = `<img src="${logoUrl}" alt="Business logo" style="max-width: 200px; max-height: 120px; border-radius: 8px; display: block; object-fit: contain;">`;
          console.log('[owner] Logo HTML set');
        }
      } else {
        // No logo - hide the element or show placeholder
        if (logoEl.tagName === 'IMG') {
          logoEl.style.display = 'none';
        }
        console.log('[owner] No valid logo URL found. Logo URL:', logoUrl);
        console.log('[owner] Business object keys:', Object.keys(business));
      }
    } else {
      console.warn('[owner] Logo element not found in DOM. Tried: biz-logo, logo');
    }
    
    // Gallery
    const galleryEl = $('gallery');
    if (galleryEl) {
      if (business.gallery_urls && Array.isArray(business.gallery_urls) && business.gallery_urls.length > 0) {
        const validUrls = business.gallery_urls.filter(url => url && !url.startsWith('blob:'));
        if (validUrls.length > 0) {
          galleryEl.innerHTML = validUrls.map((url, idx) => {
            return `<div style="position: relative; overflow: hidden; border-radius: 8px; background: #1a1a1a; border: 1px solid #2a2a2a;">
              <img src="${url}" alt="Gallery image ${idx + 1}" style="width: 100%; height: 200px; object-fit: cover; display: block; transition: transform 0.3s; cursor: pointer;" 
                   onmouseover="this.style.transform='scale(1.05)'" 
                   onmouseout="this.style.transform='scale(1)'"
                   onclick="window.open('${url}', '_blank')">
            </div>`;
          }).join('');
        } else {
          galleryEl.innerHTML = '<p style="color: #AFAFAF; text-align: center; padding: 40px; font-size: 14px;">No gallery images available.</p>';
        }
      } else {
        galleryEl.innerHTML = '<p style="color: #AFAFAF; text-align: center; padding: 40px; font-size: 14px;">No gallery images yet.</p>';
      }
    }
    
    // Category/Industry
    const categoryEl = $('category');
    if (categoryEl) {
      categoryEl.textContent = val(business.category || business.industry, 'Not specified');
    }
    
    console.log('[owner] Business display completed');
  } catch (error) {
    console.error('[owner] Error loading business:', error);
    alert('Error loading business data. Please try again.');
  }
}

// Export the function for use in owner.html
export { loadAndDisplayBusiness };

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const businessId = urlParams.get('businessId');
    loadAndDisplayBusiness(businessId);
  });
} else {
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('businessId');
  loadAndDisplayBusiness(businessId);
}
