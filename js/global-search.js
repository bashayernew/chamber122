// Global Search Bar - Works on every page
// Adds a search bar to the navigation that redirects to directory with search parameters

let listenersAttached = false;

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

  // Setup event listeners only once
  if (!listenersAttached) {
    setupGlobalSearchListeners();
    listenersAttached = true;
  }
}

function setupGlobalSearchListeners() {
  // Use event delegation to handle dynamically created search inputs
  document.addEventListener('keypress', (e) => {
    if (e.target && e.target.id === 'global-search-input' && e.key === 'Enter') {
      e.preventDefault();
      performGlobalSearch(e.target.value);
    }
  });

  // Handle search button clicks using event delegation
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'global-search-btn' || e.target.closest('#global-search-btn'))) {
      const searchBtn = e.target.id === 'global-search-btn' ? e.target : e.target.closest('#global-search-btn');
      const container = searchBtn.closest('.global-search-container');
      const input = container?.querySelector('#global-search-input');
      if (input) {
        performGlobalSearch(input.value);
      }
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

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalSearch);
} else {
  initGlobalSearch();
}

// Export for manual initialization if needed
window.initGlobalSearch = initGlobalSearch;
window.performGlobalSearch = performGlobalSearch;





