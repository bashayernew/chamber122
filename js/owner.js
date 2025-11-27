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
        console.log('[owner] No business found - redirecting to form');
        if (confirm('No business profile found. Would you like to create one?')) {
          window.location.href = '/owner-form.html';
        }
        return;
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
    // Check both business status and user status from localStorage
    const statusBadge = $('status-badge');
    if (statusBadge) {
      let status = (business.status || 'pending').toLowerCase();
      
      // Also check user status from localStorage (admin dashboard state)
      try {
        const user = getCurrentUser();
        if (user && user.id) {
          const stateKey = 'chamber_admin_dashboard_state';
          const stateStr = localStorage.getItem(stateKey);
          const state = stateStr ? JSON.parse(stateStr) : {};
          const userStatus = state.userStatuses && state.userStatuses[user.id] ? state.userStatuses[user.id] : null;
          if (userStatus) {
            status = userStatus.toLowerCase();
            console.log('[owner] Using status from admin dashboard state:', status);
          } else {
            // Also check from users array
            try {
              const { getAllUsers } = await import('./admin-auth.js');
              const users = getAllUsers();
              const userData = users.find(u => u.id === user.id);
              if (userData && userData.status) {
                status = userData.status.toLowerCase();
                console.log('[owner] Using status from users array:', status);
              }
            } catch (err) {
              console.debug('[owner] Could not check users array:', err);
            }
          }
        }
      } catch (err) {
        console.debug('[owner] Could not check user status from localStorage:', err);
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
      const descText = val(business.description || business.short_description, 'No description yet...');
      descEl.textContent = descText;
      console.log('[owner] Setting description:', descText.substring(0, 50) + '...');
    }
    
    const storyEl = $('story');
    if (storyEl) {
      const storyText = val(business.story, 'No story yet...');
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
    
    // Logo
    const logoEl = $('logo');
    if (logoEl && business.logo_url) {
      if (logoEl.tagName === 'IMG') {
        logoEl.src = business.logo_url;
        logoEl.alt = business.name || business.business_name || 'Business logo';
      } else {
        logoEl.innerHTML = `<img src="${business.logo_url}" alt="Business logo" style="max-width: 200px; max-height: 120px; border-radius: 8px;">`;
      }
    }
    
    // Gallery
    const galleryEl = $('gallery');
    if (galleryEl && business.gallery_urls && business.gallery_urls.length > 0) {
      galleryEl.innerHTML = business.gallery_urls.map((url, idx) => {
        return `<img src="${url}" alt="Gallery image ${idx + 1}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin: 8px; object-fit: cover;">`;
      }).join('');
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
