import { sb } from "./supabase.js";

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
  renderBusinesses();
}

// Load approved accounts from Supabase
async function loadBusinesses() {
  try {
    const { data, error } = await sb().from('businesses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allBusinesses = data || [];
    filteredBusinesses = [...allBusinesses];
    updateResultsCount();
  } catch (error) {
    console.error('Error loading accounts:', error);
    // Fallback to sample data if Supabase fails
    allBusinesses = getSampleBusinesses();
    filteredBusinesses = [...allBusinesses];
    updateResultsCount();
  }
}

// Sample data fallback
function getSampleBusinesses() {
  return [
    {
      id: 1,
      name: "Al Kuwaiti Kitchen",
      category: "Food & Beverage",
      description: "Authentic Kuwaiti cuisine with modern twists. Fresh ingredients, traditional recipes.",
      logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=200&fit=crop",
      city: "Kuwait City",
      status: "approved"
    },
    {
      id: 2,
      name: "Desert Rose Boutique",
      category: "Fashion & Beauty",
      description: "Elegant fashion boutique offering contemporary styles for the modern Kuwaiti woman.",
      logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop",
      city: "Hawally",
      status: "approved"
    },
    {
      id: 3,
      name: "TechFlow Kuwait",
      category: "Technology",
      description: "Innovative tech solutions for accounts. Web development, mobile apps, digital transformation.",
      logo_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
      city: "Kuwait City",
      status: "approved"
    }
  ];
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
  
  filteredBusinesses = allBusinesses.filter(business => {
    const matchesSearch = !searchTerm || 
      business.name.toLowerCase().includes(searchTerm) ||
      (business.description && business.description.toLowerCase().includes(searchTerm));
    
    const matchesCategory = !category || business.category === category;
    
    return matchesSearch && matchesCategory;
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
  if (!listElement) return;
  
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const accountsToShow = filteredBusinesses.slice(startIndex, endIndex);
  
  if (currentPage === 0) {
    listElement.innerHTML = '';
  }
  
  accountsToShow.forEach(business => {
    const businessCard = createBusinessCard(business);
    listElement.appendChild(businessCard);
  });
  
  // Show/hide load more button
  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = endIndex < filteredBusinesses.length ? 'block' : 'none';
  }
}

// Create business card element
function createBusinessCard(business) {
  const card = document.createElement('div');
  card.className = 'msme-card';
  card.setAttribute('data-testid', 'msme-card');
  card.onclick = () => openBusinessModal(business);
  
  card.innerHTML = `
    <div class="msme-logo">
      <img src="${business.logo_url || 'images/logo.png'}" alt="${business.name}" onerror="this.src='images/logo.png'">
    </div>
    <div class="msme-info">
      <h3 class="msme-name">${business.name}</h3>
      <div class="msme-category">${business.category}</div>
      <div class="msme-status">
        <span class="status-tag verified">Verified</span>
      </div>
      <p class="msme-description">${business.description || 'No description available.'}</p>
      <button class="visit-profile-btn">Visit Profile</button>
    </div>
  `;
  
  return card;
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

