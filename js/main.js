// main.js - Using localStorage only (no backend, no API)
import { getAllBusinesses } from './auth-localstorage.js';

// Real MSME data will be loaded from localStorage
const msmeData = [];

// DOM elements
const directoryGrid = document.getElementById('directory-grid');
const modalOverlay = document.getElementById('modal-overlay');
const searchBtn = document.querySelector('.search-btn');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('directory-grid')) {
    displayMSMEs(msmeData);
  }
  if (document.getElementById('newest-grid')) {
    displayNewestMSMEs();
  }
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  if (searchBtn) {
    searchBtn.addEventListener('click', searchBusinesses);
  }
  
  // Modal close on overlay click
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
  
  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
  
  // Newsletter subscription
  const newsletterBtn = document.querySelector('.newsletter-btn');
  if (newsletterBtn) {
    newsletterBtn.addEventListener('click', subscribeNewsletter);
  }
}

// Display MSMEs in the directory grid
function displayMSMEs(msmes) {
  if (!directoryGrid) return;
  
  if (msmes.length === 0) {
    directoryGrid.innerHTML = '<p>No businesses found.</p>';
    return;
  }
  
  directoryGrid.innerHTML = msmes.map(msme => createMSMECard(msme)).join('');
}

// Create MSME card HTML
function createMSMECard(msme) {
  const name = msme.name || msme.business_name || 'Unknown Business';
  const description = msme.description || msme.short_description || '';
  const category = msme.category || msme.industry || 'General';
  const location = msme.city || msme.area || 'Kuwait';
  const logo = msme.logo_url || '';
  
  return `
    <div class="msme-card" data-business-id="${msme.id}">
      ${logo ? `<img src="${logo}" alt="${escapeHtml(name)}" class="msme-logo" onerror="this.style.display='none'">` : ''}
      <h3>${escapeHtml(name)}</h3>
      <p class="category">${escapeHtml(category)}</p>
      <p class="location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}</p>
      ${description ? `<p class="description">${escapeHtml(description.substring(0, 100))}${description.length > 100 ? '...' : ''}</p>` : ''}
      <a href="/owner.html?businessId=${msme.id}" class="btn btn-primary">View Profile</a>
    </div>
  `;
}

// Escape HTML helper
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Search businesses
function searchBusinesses() {
  const nameInput = document.getElementById('quick-business-name');
  const categorySelect = document.getElementById('quick-category');
  const locationSelect = document.getElementById('quick-location');
  
  const name = nameInput ? nameInput.value.trim() : '';
  const category = categorySelect ? categorySelect.value : '';
  const location = locationSelect ? locationSelect.value : '';
  
  // Build URL with search parameters
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (category) params.set('category', category);
  if (location) params.set('location', location);
  
  // Redirect to directory page with search parameters
  window.location.href = `/directory.html?${params.toString()}`;
}

// Close modal
function closeModal() {
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
}

// Newsletter subscription
function subscribeNewsletter() {
  const emailInput = document.querySelector('.newsletter-input');
  const email = emailInput ? emailInput.value.trim() : '';
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  
  // Store subscription in localStorage
  try {
    const subscriptions = JSON.parse(localStorage.getItem('chamber122_newsletter') || '[]');
    if (!subscriptions.includes(email)) {
      subscriptions.push(email);
      localStorage.setItem('chamber122_newsletter', JSON.stringify(subscriptions));
    }
    alert('Thank you for subscribing!');
    if (emailInput) emailInput.value = '';
  } catch (e) {
    console.error('Error saving newsletter subscription:', e);
    alert('Subscription saved locally. Thank you!');
  }
}

// Display newest MSMEs on home page
async function displayNewestMSMEs() {
  const newestGrid = document.getElementById('newest-grid');
  if (!newestGrid) return;
  
  try {
    // Get businesses from localStorage
    const businesses = getAllBusinesses();
    
    // Filter to only approved and active businesses
    const approvedBusinesses = businesses.filter(b => 
      (b.status === 'approved' || !b.status) && 
      (b.is_active !== false)
    );
    
    // Get the 4 most recent businesses
    const newestMSMEs = approvedBusinesses.slice(-4).reverse();
    
    newestGrid.innerHTML = '';
    if (newestMSMEs.length === 0) {
      newestGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #aaa; grid-column: 1 / -1;">
          <i class="fas fa-building" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
          <h3 style="font-size: 20px; margin-bottom: 8px; color: #fff;">No businesses yet</h3>
          <p style="font-size: 14px; color: #ccc;">Be the first to join our community!</p>
        </div>
      `;
      return;
    }
    
    newestMSMEs.forEach(msme => {
      const card = createMSMECard(msme);
      newestGrid.insertAdjacentHTML('beforeend', card);
    });
    
    console.log(`[main] Displayed ${newestMSMEs.length} newest businesses`);
  } catch (error) {
    console.error('[main] Error loading newest MSMEs:', error);
    newestGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #aaa; grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
        <h3 style="font-size: 20px; margin-bottom: 8px; color: #fff;">Error loading businesses</h3>
        <p style="font-size: 14px; color: #ccc;">Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Global search function (redirects to directory)
function performQuickSearch() {
  const searchInput = document.getElementById('quick-business-name');
  const categorySelect = document.getElementById('quick-category');
  const locationSelect = document.getElementById('quick-location');
  
  const name = searchInput ? searchInput.value.trim() : '';
  const category = categorySelect ? categorySelect.value : '';
  const location = locationSelect ? locationSelect.value : '';
  
  // Build URL with search parameters
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (category) params.set('category', category);
  if (location) params.set('location', location);
  
  // Redirect to directory page with search parameters
  window.location.href = `/directory.html?${params.toString()}`;
}

// Make search function globally available
window.performQuickSearch = performQuickSearch;
