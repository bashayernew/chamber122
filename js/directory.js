// directory.js - Using localStorage only (no backend, no API)
import { getAllBusinesses } from './auth-localstorage.js';

let currentPage = 0;
const pageSize = 12;
let allBusinesses = [];
let filteredBusinesses = [];

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

// Load approved accounts from localStorage
async function loadBusinesses() {
  try {
    console.log('[directory] Loading businesses from localStorage...');
    
    // Get all businesses from localStorage
    allBusinesses = getAllBusinesses();
    
    // Filter to show ALL businesses except explicitly suspended ones
    allBusinesses = allBusinesses.filter(b => {
      // Exclude only if explicitly suspended
      if (b.status === 'suspended') return false;
      // Exclude only if explicitly inactive
      if (b.is_active === false) return false;
      // Include everything else (pending, approved, or no status)
      return true;
    });
    
    console.log(`[directory] Loaded ${allBusinesses.length} businesses from localStorage`);
    
    filteredBusinesses = [...allBusinesses];
    updateResultsCount();
    renderBusinesses();
  } catch (error) {
    console.error('[directory] Error loading businesses:', error);
    allBusinesses = [];
    filteredBusinesses = [];
    updateResultsCount();
    renderBusinesses();
  }
}

// Filter businesses based on search and category
function filterBusinesses() {
  const searchTerm = document.getElementById('q') ? document.getElementById('q').value.toLowerCase() : '';
  const category = document.getElementById('cat') ? document.getElementById('cat').value : '';
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('location') ? urlParams.get('location').toLowerCase() : '';

  filteredBusinesses = allBusinesses.filter(business => {
    const description = business.description || business.short_description || '';
    const businessCategory = business.category || business.industry || '';
    const businessLocation = (business.city || business.area || business.location || '').toLowerCase();

    const matchesSearch = !searchTerm ||
      (business.name && business.name.toLowerCase().includes(searchTerm)) ||
      (business.business_name && business.business_name.toLowerCase().includes(searchTerm)) ||
      description.toLowerCase().includes(searchTerm);

    const matchesCategory = !category || businessCategory === category;

    const matchesLocation = !locationParam ||
      businessLocation.includes(locationParam.replace('-', ' ')) ||
      businessLocation.includes(locationParam);

    return matchesSearch && matchesCategory && matchesLocation;
  });
  
  currentPage = 0;
  updateResultsCount();
  renderBusinesses();
}

// Update results count
function updateResultsCount() {
  const countEl = document.getElementById('results-count');
  if (countEl) {
    const total = allBusinesses.length;
    const filtered = filteredBusinesses.length;
    if (filtered < total) {
      countEl.textContent = `Showing ${filtered} of ${total} businesses`;
    } else {
      countEl.textContent = `Showing ${total} businesses`;
    }
  }
}

// Render businesses in grid
function renderBusinesses() {
  const grid = document.getElementById('business-grid');
  if (!grid) return;

  const start = currentPage * pageSize;
  const end = start + pageSize;
  const pageBusinesses = filteredBusinesses.slice(start, end);

  if (pageBusinesses.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #a0a0a0;">
        <i class="fas fa-building" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
        <h3 style="font-size: 20px; margin-bottom: 8px; color: #fff;">No businesses found</h3>
        <p style="font-size: 14px; color: #ccc;">Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = pageBusinesses.map(business => {
    const name = business.name || business.business_name || 'Unknown Business';
    const description = business.description || business.short_description || '';
    const category = business.category || business.industry || 'General';
    const location = business.city || business.area || 'Kuwait';
    const logo = business.logo_url || '';
    
    return `
      <div class="business-card" data-business-id="${business.id}">
        ${logo ? `<img src="${logo}" alt="${escapeHtml(name)}" class="business-logo" onerror="this.style.display='none'">` : ''}
        <h3>${escapeHtml(name)}</h3>
        <p class="category">${escapeHtml(category)}</p>
        <p class="location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}</p>
        ${description ? `<p class="description">${escapeHtml(description.substring(0, 100))}${description.length > 100 ? '...' : ''}</p>` : ''}
        <a href="/owner.html?businessId=${business.id}" class="btn btn-primary">View Profile</a>
      </div>
    `;
  }).join('');

  // Update pagination
  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;

  const totalPages = Math.ceil(filteredBusinesses.length / pageSize);
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  
  // Previous button
  if (currentPage > 0) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">Previous</button>`;
  }
  
  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="page-btn active">${i + 1}</button>`;
    } else {
      html += `<button class="page-btn" onclick="goToPage(${i})">${i + 1}</button>`;
    }
  }
  
  // Next button
  if (currentPage < totalPages - 1) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">Next</button>`;
  }
  
  pagination.innerHTML = html;
}

// Go to specific page
window.goToPage = function(page) {
  currentPage = page;
  renderBusinesses();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('q');
  const categorySelect = document.getElementById('cat');
  
  if (searchInput) {
    searchInput.addEventListener('input', filterBusinesses);
  }
  
  if (categorySelect) {
    categorySelect.addEventListener('change', filterBusinesses);
  }
}

// Escape HTML helper
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDirectory);
} else {
  initDirectory();
}
