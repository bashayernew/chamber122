// Directory page functionality
let currentPage = 1;
const itemsPerPage = 12;
let filteredData = [];

// Initialize directory page
document.addEventListener('DOMContentLoaded', function() {
  filteredData = [...msmeData];
  displayBusinesses(filteredData.slice(0, itemsPerPage));
  updateResultsCount();
});

// Filter businesses
function filterBusinesses() {
  const nameFilter = document.getElementById('filter-name').value.toLowerCase();
  const locationFilter = document.getElementById('filter-location').value;
  const categoryFilter = document.getElementById('filter-category').value;
  
  filteredData = msmeData.filter(business => {
    const matchesName = !nameFilter || business.name.toLowerCase().includes(nameFilter);
    const matchesLocation = !locationFilter || business.location.toLowerCase().includes(locationFilter.replace('-', ' '));
    const matchesCategory = !categoryFilter || business.category.toLowerCase().includes(categoryFilter.replace('-', ' '));
    
    return matchesName && matchesLocation && matchesCategory;
  });
  
  currentPage = 1;
  displayBusinesses(filteredData.slice(0, itemsPerPage));
  updateResultsCount();
  updateLoadMoreButton();
}

// Clear all filters
function clearFilters() {
  document.getElementById('filter-name').value = '';
  document.getElementById('filter-location').value = '';
  document.getElementById('filter-category').value = '';
  
  filteredData = [...msmeData];
  currentPage = 1;
  displayBusinesses(filteredData.slice(0, itemsPerPage));
  updateResultsCount();
  updateLoadMoreButton();
}

// Display businesses in grid
function displayBusinesses(businesses) {
  const grid = document.getElementById('directory-grid');
  
  if (currentPage === 1) {
    grid.innerHTML = '';
  }
  
  businesses.forEach(business => {
    const card = createBusinessCard(business);
    grid.appendChild(card);
  });
  
  // Add animation
  const cards = grid.querySelectorAll('.msme-card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${(index % itemsPerPage) * 0.1}s`;
    card.classList.add('fade-in-up');
  });
}

// Create business card
function createBusinessCard(business) {
  const card = document.createElement('div');
  card.className = 'msme-card';
  card.onclick = () => openBusinessModal(business.id);
  
  const statusClass = business.status === 'verified' ? 'verified' : '';
  
  card.innerHTML = `
    <img src="${business.image}" alt="${business.name}">
    <h3>${business.name}</h3>
    <div class="category">${business.category}</div>
    <div class="status ${statusClass}">${business.status === 'verified' ? 'Verified' : 'Available'}</div>
    <p class="description">${business.description}</p>
    <div class="visit-btn">Visit Profile</div>
  `;
  
  return card;
}

// Load more businesses
function loadMoreBusinesses() {
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const nextBatch = filteredData.slice(startIndex, endIndex);
  
  if (nextBatch.length > 0) {
    displayBusinesses(nextBatch);
    currentPage++;
    updateLoadMoreButton();
  }
}

// Update load more button visibility
function updateLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  const hasMore = (currentPage * itemsPerPage) < filteredData.length;
  
  if (loadMoreBtn) {
    loadMoreBtn.style.display = hasMore ? 'block' : 'none';
  }
}

// Update results count
function updateResultsCount() {
  const resultsInfo = document.querySelector('.results-info');
  if (resultsInfo) {
    const showing = Math.min(currentPage * itemsPerPage, filteredData.length);
    resultsInfo.textContent = `Showing ${showing} of ${filteredData.length} businesses`;
  }
}

// Open business modal
function openBusinessModal(businessId) {
  const business = msmeData.find(b => b.id == businessId || b.name.toLowerCase().replace(/\s+/g, '-') === businessId);
  if (business) {
    openModal(business);
  }
}

