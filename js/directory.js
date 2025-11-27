// directory.js - Using backend API instead of Supabase
import { api } from './api.js';

let currentPage = 0;
const pageSize = 12;
let allBusinesses = [];
let filteredBusinesses = [];

// User dropdown functionality is handled by main.js

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

// Make functions globally available
window.toggleMobileMenu = toggleMobileMenu;

// Initialize directory
async function initDirectory() {
  await loadBusinesses();
  setupEventListeners();
  applyURLFilters(); // Apply filters from URL parameters
  renderBusinesses();
}

// Apply filters from URL parameters
function applyURLFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Get URL parameters
  const nameParam = urlParams.get('name');
  const categoryParam = urlParams.get('category');
  const locationParam = urlParams.get('location');
  
  // Set search input (directory uses 'q' for search)
  const searchInput = document.getElementById('q');
  if (searchInput && nameParam) {
    searchInput.value = nameParam;
  }
  
  // Set category select
  const categorySelect = document.getElementById('cat');
  if (categorySelect && categoryParam) {
    // Category values should now match between home and directory pages
    categorySelect.value = categoryParam;
  }
  
  // Apply filters if any URL parameters exist
  if (nameParam || categoryParam || locationParam) {
    // Small delay to ensure DOM elements are ready
    setTimeout(() => {
      filterBusinesses();
    }, 100);
  }
}

// Load approved accounts from backend API
async function loadBusinesses() {
  try {
    console.log('[directory] Loading businesses from API...');
    const response = await fetch('/api/businesses/public');
    const data = await response.json();
    
    if (data.ok && data.businesses) {
      allBusinesses = data.businesses;
      console.log(`[directory] Loaded ${allBusinesses.length} businesses`);
    } else {
      console.warn('[directory] No businesses returned from API');
      allBusinesses = [];
    }
    
    filteredBusinesses = [...allBusinesses];
    updateResultsCount();
    renderBusinesses();
  } catch (error) {
    console.error('[directory] Error loading businesses:', error);
    allBusinesses = [];
    filteredBusinesses = [];
    updateResultsCount();
  }
}

// No sample data - all businesses loaded from Supabase
function getSampleBusinesses() {
  return [];
}

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('q');
  const categorySelect = document.getElementById('cat');
  const searchBtn = document.getElementById('searchBtn');
  const loadMoreBtn = document.getElementById('loadMore');

  if (searchInput) {
    searchInput.addEventListener('input', filterBusinesses);
  }
  
  if (categorySelect) {
    categorySelect.addEventListener('change', filterBusinesses);
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', filterBusinesses);
  }
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreBusinesses);
  }
}

// Filter accounts based on search and category
function filterBusinesses() {
  const searchTerm = document.getElementById('q')?.value?.toLowerCase() || '';
  const category = document.getElementById('cat')?.value || '';
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('location')?.toLowerCase() || '';
  
  filteredBusinesses = allBusinesses.filter(business => {
    const description = business.description || business.short_description || '';
    const businessCategory = business.category || business.industry || '';
    const businessLocation = (business.city || business.area || business.location || '').toLowerCase();
    
    const matchesSearch = !searchTerm || 
      (business.name && business.name.toLowerCase().includes(searchTerm)) ||
      description.toLowerCase().includes(searchTerm);
    
    const matchesCategory = !category || businessCategory === category;
    
    // Match location (city, area, or location field)
    const matchesLocation = !locationParam || 
      businessLocation.includes(locationParam.replace('-', ' ')) ||
      businessLocation.includes(locationParam);
    
    return matchesSearch && matchesCategory && matchesLocation;
  });
  
  currentPage = 0;
  updateResultsCount();
  renderBusinesses();
}

// Update results count display
function updateResultsCount() {
  const countElement = document.querySelector('.results-info span');
  if (countElement) {
    countElement.textContent = `Showing ${filteredBusinesses.length} accounts`;
  }
}

// Render accounts with pagination
function renderBusinesses() {
  const listElement = document.getElementById('list');
  if (!listElement) {
    console.error('List element not found');
    return;
  }
  
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const accountsToShow = filteredBusinesses.slice(startIndex, endIndex);
  
  if (currentPage === 0) {
    listElement.innerHTML = '';
  }
  
  accountsToShow.forEach(business => {
    console.log('Creating card for business:', business);
    const businessCard = createBusinessCard(business);
    if (businessCard) {
      listElement.appendChild(businessCard);
    } else {
      console.error('Failed to create card for business:', business);
    }
  });
  
  // Show/hide load more button
  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = endIndex < filteredBusinesses.length ? 'block' : 'none';
  }
}

// Create business card element
function createBusinessCard(business) {
  if (!business || !business.id) {
    console.error('Invalid business data:', business);
    return null;
  }
  
  const card = document.createElement('div');
  card.className = 'msme-card';
  card.setAttribute('data-testid', 'msme-card');
  card.setAttribute('data-business-id', business.id);
  
  // Add cursor pointer style
  card.style.cursor = 'pointer';
  
  // Format description - check both description and short_description fields
  const description = business.description || business.short_description || 'No description available.';
  const truncatedDescription = description.length > 150 ? description.substring(0, 150) + '...' : description;
  
  // Get category - check both category and industry fields
  const category = business.category || business.industry || 'Business';
  
  // Get business name or use default - check both name and business_name fields
  const businessName = (business.name || business.business_name || 'Unnamed Business').trim();
  
  // Filter out blob URLs - they're temporary and won't work after page reload
  let logoUrl = business.logo_url || '';
  if (logoUrl.startsWith('blob:')) {
    logoUrl = ''; // Don't use blob URLs
  }
  
  console.log('Card data:', { businessName, category, description: truncatedDescription, logo: logoUrl, fullBusiness: business });
  
  // Ensure we have valid text content - use fallback values
  const safeName = (businessName && businessName.trim()) ? businessName : (business.business_name || business.name || 'Business Name');
  const safeCategory = (category && category.trim()) ? category : (business.industry || 'Business');
  const safeDescription = (truncatedDescription && truncatedDescription.trim()) ? truncatedDescription : 'No description available.';
  
  // Debug: Log what we're about to render
  console.log('Rendering card with:', {
    safeName,
    safeCategory,
    safeDescription,
    hasName: !!safeName,
    hasCategory: !!safeCategory,
    hasDescription: !!safeDescription,
    logoUrl: logoUrl || 'No logo'
  });
  
  // Get status badge for approved businesses
  const status = (business.status || 'pending').toLowerCase();
  const statusBadge = status === 'approved' 
    ? `<span class="status-badge-approved" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px;">
        <i class="fas fa-check-circle" style="font-size: 10px;"></i> Verified
       </span>`
    : '';
  
  // Match home page card style
  card.innerHTML = `
    <div style="position: relative; margin-bottom: 16px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(safeName)}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
      <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #ffd166, #ff6b6b); display: ${logoUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; border-radius: 12px;">
        <i class="fas fa-building" style="color: #111; font-size: 48px;"></i>
      </div>
      <div class="tag" style="position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, #4ade80, #22c55e); color: #111; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">New</div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
      <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin: 0;">${escapeHtml(safeName)}</h3>
      ${statusBadge}
    </div>
    <div class="category" style="color: #ffd166; font-size: 14px; margin-bottom: 16px; font-weight: 500;">${escapeHtml(safeCategory)}</div>
    <div class="explore-btn" style="background: linear-gradient(135deg, #ffd166, #ffed4e); color: #111; padding: 12px 20px; border-radius: 8px; text-align: center; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; width: 100%;">Visit Profile</div>
  `;
  
  // Apply card container styles to match home page
  card.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
  card.style.borderRadius = '16px';
  card.style.padding = '24px';
  card.style.border = '1px solid #333';
  card.style.transition = 'all 0.3s ease';
  card.style.cursor = 'pointer';
  card.style.position = 'relative';
  card.style.overflow = 'hidden';
  
  // Set up click handler on the button (explore-btn)
  const visitBtn = card.querySelector('.explore-btn');
  if (visitBtn) {
    visitBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent card click from firing
      e.preventDefault();
      const businessId = card.getAttribute('data-business-id');
      if (businessId) {
        window.location.href = `owner.html?businessId=${businessId}`;
      }
      return false;
    });
  }
  
  // Add hover effect to button
  if (visitBtn) {
    visitBtn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 12px rgba(255, 209, 102, 0.4)';
    });
    visitBtn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
  }
  
  // Add hover effect to card
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-4px)';
    this.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
  });
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });
  
  // Set up click handler on the card (using addEventListener for better compatibility)
  card.addEventListener('click', function(e) {
    // Don't navigate if clicking directly on the button (it has its own handler)
    if (e.target.closest('.explore-btn')) {
      return;
    }
    // Navigate to profile page
    const businessId = card.getAttribute('data-business-id');
    if (businessId) {
      window.location.href = `/owner.html?businessId=${businessId}`;
    }
  });
  
  return card;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load more accounts
function loadMoreBusinesses() {
  currentPage++;
  renderBusinesses();
}

// Open business modal
function openBusinessModal(business) {
  const modal = document.getElementById('modal-overlay');
  if (!modal) return;
  
  // Populate modal with business data
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalDescription = document.getElementById('modal-description');
  const modalStory = document.getElementById('modal-story');
  
  if (modalImage) modalImage.src = business.logo_url || 'images/logo.png';
  if (modalTitle) modalTitle.textContent = business.name;
  if (modalCategory) modalCategory.textContent = business.category;
  if (modalDescription) modalDescription.textContent = business.description || 'No description available.';
  if (modalStory) modalStory.textContent = business.why_started || 'Story coming soon...';
  
  // Set up contact buttons
  const whatsappBtn = document.getElementById('modal-whatsapp');
  const emailBtn = document.getElementById('modal-email');
  const websiteBtn = document.getElementById('modal-website');
  
  if (whatsappBtn && business.phone) {
    whatsappBtn.href = `https://wa.me/965${business.phone.replace(/\D/g, '')}`;
    whatsappBtn.style.display = 'inline-flex';
  } else if (whatsappBtn) {
    whatsappBtn.style.display = 'none';
  }
  
  if (emailBtn && business.email) {
    emailBtn.href = `mailto:${business.email}`;
    emailBtn.style.display = 'inline-flex';
  } else if (emailBtn) {
    emailBtn.style.display = 'none';
  }
  
  if (websiteBtn && business.website) {
    websiteBtn.href = business.website;
    websiteBtn.style.display = 'inline-flex';
  } else if (websiteBtn) {
    websiteBtn.style.display = 'none';
  }
  
  modal.style.display = 'flex';
}

// Close modal
function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Global functions for onclick handlers
window.openBusinessModal = openBusinessModal;
window.closeModal = closeModal;
window.loadMoreBusinesses = loadMoreBusinesses;
window.filterBusinesses = filterBusinesses;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDirectory);


