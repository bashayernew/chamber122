// Global Search Bar - Works on every page
// Adds a search bar to the navigation that redirects to directory with search parameters

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

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalSearch);
} else {
  initGlobalSearch();
}

// Export for manual initialization if needed
window.initGlobalSearch = initGlobalSearch;



// Adds a search bar to the navigation that redirects to directory with search parameters

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

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalSearch);
} else {
  initGlobalSearch();
}

// Export for manual initialization if needed
window.initGlobalSearch = initGlobalSearch;





