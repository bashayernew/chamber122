// Real MSME data will be loaded from Supabase
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
  
  directoryGrid.innerHTML = '';
  
  msmes.forEach(msme => {
    const card = createMSMECard(msme);
    directoryGrid.appendChild(card);
  });
}

// Create MSME card element
function createMSMECard(msme) {
  const card = document.createElement('div');
  card.className = 'msme-card';
  card.onclick = () => openModal(msme);
  
  const statusClass = msme.status === 'verified' ? 'verified' : '';
  
  card.innerHTML = `
    <img src="${msme.image}" alt="${msme.name}">
    <h3>${msme.name}</h3>
    <div class="category">${msme.category}</div>
    <div class="status ${statusClass}">${msme.status === 'verified' ? 'Verified' : 'Available'}</div>
    <p class="description">${msme.description}</p>
    <div class="visit-btn">Visit Profile</div>
  `;
  
  return card;
}

// Search businesses
function searchBusinesses() {
  const location = document.getElementById('location').value;
  const category = document.getElementById('category').value;
  const businessName = document.getElementById('business-name').value.toLowerCase();
  
  let filteredData = msmeData.filter(msme => {
    const matchesLocation = !location || msme.location.toLowerCase().includes(location.replace('-', ' '));
    const matchesCategory = !category || msme.category.toLowerCase().includes(category.replace('-', ' '));
    const matchesName = !businessName || msme.name.toLowerCase().includes(businessName);
    
    return matchesLocation && matchesCategory && matchesName;
  });
  
  displayMSMEs(filteredData);
  
  // Add animation to cards
  const cards = document.querySelectorAll('.msme-card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    card.classList.add('fade-in-up');
  });
}

// Open modal with MSME details
function openModal(msme) {
  document.getElementById('modal-image').src = msme.image;
  document.getElementById('modal-image').alt = msme.name;
  document.getElementById('modal-title').textContent = msme.name;
  document.getElementById('modal-category').textContent = msme.category;
  document.getElementById('modal-description').textContent = msme.description;
  document.getElementById('modal-story').textContent = msme.story;
  
  // Set up contact links
  document.getElementById('modal-email').href = `mailto:${msme.email}`;
  document.getElementById('modal-whatsapp').href = `https://wa.me/${msme.whatsapp.replace(/[^0-9]/g, '')}`;
  document.getElementById('modal-website').href = msme.website;
  
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close modal
function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Newsletter subscription
function subscribeNewsletter() {
  const emailInput = document.querySelector('.newsletter-input');
  const email = emailInput.value.trim();
  
  if (!email || !isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  
  // Simulate subscription
  alert('Thank you for subscribing to our newsletter!');
  emailInput.value = '';
}

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Smooth scroll for navigation links
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;

  const href = a.getAttribute('href');

  // If it's just "#", do nothing but prevent jump
  if (href === '#') {
    e.preventDefault();
    return;
  }

  // Only try querySelector for real IDs like "#section-1"
  if (href && href.startsWith('#') && href.length > 1) {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  // otherwise let the link behave normally (external/internal nav)
}, { passive: false });

// Add scroll effect to navbar
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 100) {
    navbar.style.background = 'rgba(15, 15, 15, 0.98)';
  } else {
    navbar.style.background = 'rgba(15, 15, 15, 0.95)';
  }
});

// Auto-scroll featured carousel (optional)
function autoScrollCarousel() {
  const carousel = document.querySelector('.featured-carousel');
  if (carousel) {
    setInterval(() => {
      carousel.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }, 5000);
  }
}

// Initialize auto-scroll (uncomment if desired)
// autoScrollCarousel();

// Add loading states
function showLoading() {
  document.body.classList.add('loading');
}

function hideLoading() {
  document.body.classList.remove('loading');
}

// Display newest MSMEs on home page
function displayNewestMSMEs() {
  const newestGrid = document.getElementById('newest-grid');
  if (!newestGrid) return;
  
  // Get the 4 most recent MSMEs (simulate newest by reversing array)
  const newestMSMEs = msmeData.slice(-4).reverse();
  
  newestGrid.innerHTML = '';
  newestMSMEs.forEach(msme => {
    const card = createMSMECard(msme);
    newestGrid.appendChild(card);
  });
}

// Quick search functionality for home page
function performQuickSearch() {
  const businessName = document.getElementById('quick-business-name')?.value?.trim();
  const category = document.getElementById('quick-category')?.value?.trim();
  const area = document.getElementById('quick-area')?.value?.trim();
  
  // Build query string
  const params = new URLSearchParams();
  if (businessName) params.set('name', businessName);
  if (category) params.set('category', category);
  if (area) params.set('location', area);
  
  // Redirect to directory page with filters
  const queryString = params.toString();
  window.location.href = queryString ? `directory.html?${queryString}` : 'directory.html';
}

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

// Initialize global search bar
function initGlobalSearch() {
  // Find all navbar containers
  const navContainers = document.querySelectorAll('.nav-container');
  
  navContainers.forEach(container => {
    // Check if search bar already exists
    if (container.querySelector('#global-search-bar')) {
      return;
    }

    // Create search bar wrapper
    const searchWrapper = document.createElement('div');
    searchWrapper.id = 'global-search-bar';
    searchWrapper.className = 'global-search-wrapper';
    searchWrapper.innerHTML = `
      <div class="global-search-container">
        <input 
          type="text" 
          id="global-search-input" 
          class="global-search-input" 
          placeholder="Search businesses..." 
          autocomplete="off"
        />
        <button 
          type="button" 
          id="global-search-btn" 
          class="global-search-btn"
          aria-label="Search"
        >
          <i class="fas fa-search"></i>
        </button>
      </div>
    `;

    // Insert before nav-actions or at the end
    const navActions = container.querySelector('.nav-actions');
    if (navActions) {
      container.insertBefore(searchWrapper, navActions);
    } else {
      container.appendChild(searchWrapper);
    }
  });

  // Setup event listeners
  setupGlobalSearchListeners();
}

function setupGlobalSearchListeners() {
  // Handle Enter key on search input
  document.querySelectorAll('#global-search-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performGlobalSearch(input.value);
      }
    });

    // Handle search button click
    const searchBtn = input.closest('.global-search-container')?.querySelector('#global-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        performGlobalSearch(input.value);
      });
    }
  });
}

function performGlobalSearch(searchTerm) {
  const term = searchTerm?.trim() || '';
  
  if (!term) {
    // If empty, just go to directory
    window.location.href = 'directory.html';
    return;
  }

  // Redirect to directory with search parameter
  const params = new URLSearchParams();
  params.set('name', term);
  window.location.href = `directory.html?${params.toString()}`;
}

// Initialize global search on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalSearch);
} else {
  initGlobalSearch();
}

// Make functions available globally
window.initGlobalSearch = initGlobalSearch;
window.performGlobalSearch = performGlobalSearch;

// User dropdown toggle
function toggleUserMenu() {
  const userDropdownContainer = document.querySelector('.user-dropdown');
  if (userDropdownContainer) {
    userDropdownContainer.classList.toggle('active');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const userDropdownContainer = document.querySelector('.user-dropdown');
  const userMenuBtn = document.querySelector('.user-menu-btn');
  
  if (userDropdownContainer && userMenuBtn && !userMenuBtn.contains(event.target) && !userDropdownContainer.contains(event.target)) {
    userDropdownContainer.classList.remove('active');
  }
});

// Enhanced modal functionality
function openBusinessModal(businessId) {
  const business = msmeData.find(b => 
    b.id == businessId || 
    b.name.toLowerCase().replace(/\s+/g, '-') === businessId
  );
  if (business) {
    openModal(business);
  }
}

// Export functions for global access
window.searchBusinesses = searchBusinesses;
window.closeModal = closeModal;
window.performQuickSearch = performQuickSearch;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.openBusinessModal = openBusinessModal;

    const navActions = container.querySelector('.nav-actions');
    if (navActions) {
      container.insertBefore(searchWrapper, navActions);
    } else {
      container.appendChild(searchWrapper);
    }
  });

  // Setup event listeners
  setupGlobalSearchListeners();
}

function setupGlobalSearchListeners() {
  // Handle Enter key on search input
  document.querySelectorAll('#global-search-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performGlobalSearch(input.value);
      }
    });

    // Handle search button click
    const searchBtn = input.closest('.global-search-container')?.querySelector('#global-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        performGlobalSearch(input.value);
      });
    }
  });
}

function performGlobalSearch(searchTerm) {
  const term = searchTerm?.trim() || '';
  
  if (!term) {
    // If empty, just go to directory
    window.location.href = 'directory.html';
    return;
  }

  // Redirect to directory with search parameter
  const params = new URLSearchParams();
  params.set('name', term);
  window.location.href = `directory.html?${params.toString()}`;
}

// Initialize global search on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalSearch);
} else {
  initGlobalSearch();
}

// Make functions available globally
window.initGlobalSearch = initGlobalSearch;
window.performGlobalSearch = performGlobalSearch;

// User dropdown toggle
function toggleUserMenu() {
  const userDropdownContainer = document.querySelector('.user-dropdown');
  if (userDropdownContainer) {
    userDropdownContainer.classList.toggle('active');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const userDropdownContainer = document.querySelector('.user-dropdown');
  const userMenuBtn = document.querySelector('.user-menu-btn');
  
  if (userDropdownContainer && userMenuBtn && !userMenuBtn.contains(event.target) && !userDropdownContainer.contains(event.target)) {
    userDropdownContainer.classList.remove('active');
  }
});

// Enhanced modal functionality
function openBusinessModal(businessId) {
  const business = msmeData.find(b => 
    b.id == businessId || 
    b.name.toLowerCase().replace(/\s+/g, '-') === businessId
  );
  if (business) {
    openModal(business);
  }
}

// Export functions for global access
window.searchBusinesses = searchBusinesses;
window.closeModal = closeModal;
window.performQuickSearch = performQuickSearch;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.openBusinessModal = openBusinessModal;
