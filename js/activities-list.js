import { sb } from "./supabase.js";

let allActivities = [];
let filteredActivities = [];
let currentPage = 0;
const pageSize = 12;

// User dropdown toggle
function toggleUserMenu() {
  const userDropdown = document.getElementById('user-dropdown');
  if (userDropdown) {
    userDropdown.classList.toggle('active');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const userDropdown = document.getElementById('user-dropdown');
  const userMenuBtn = document.querySelector('.user-menu-btn');
  
  if (userDropdown && userMenuBtn && !userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
    userDropdown.classList.remove('active');
  }
});

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

// Make functions globally available
window.toggleUserMenu = toggleUserMenu;
window.toggleMobileMenu = toggleMobileMenu;

// Initialize activities list
async function initActivitiesList() {
  await loadActivities();
  setupEventListeners();
  renderActivities();
}

// Load activities from Supabase
async function loadActivities() {
  try {
    const { data, error } = await sb().from('activities')
      .select(`
        *,
        accounts:business_id (
          name,
          logo_url
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allActivities = data || [];
    filteredActivities = [...allActivities];
  } catch (error) {
    console.error('Error loading activities:', error);
    // Check if it's a table not found error
    if (error.code === 'PGRST106' || error.message?.includes('relation "activities" does not exist')) {
      console.log('Activities table not found - using sample data');
    }
    // Fallback to sample data if Supabase fails
    allActivities = getSampleActivities();
    filteredActivities = [...allActivities];
  }
}

// Sample data fallback
function getSampleActivities() {
  return [
    {
      id: 1,
      type: 'event',
      title: 'Kuwait Business Networking Event',
      description: 'Join us for an evening of networking with local business owners and entrepreneurs.',
      date: '2025-01-15',
      time: '18:00',
      location: 'Kuwait City Convention Center',
      cover_image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=200&fit=crop',
      businesses: { name: 'Chamber122', logo_url: null },
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: 'training',
      title: 'Digital Marketing Workshop',
      description: 'Learn the fundamentals of digital marketing for small businesses.',
      date: '2025-01-20',
      time: '14:00',
      location: 'Hawally Business Hub',
      cover_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
      businesses: { name: 'TechFlow Kuwait', logo_url: null },
      created_at: new Date().toISOString()
    }
  ];
}

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('q');
  const rangeSelect = document.getElementById('range');
  
  if (searchInput) {
    searchInput.addEventListener('input', filterActivities);
  }
  
  if (rangeSelect) {
    rangeSelect.addEventListener('change', filterActivities);
  }
}

// Filter activities based on search and date range
function filterActivities() {
  const searchTerm = document.getElementById('q')?.value?.toLowerCase() || '';
  const range = document.getElementById('range')?.value || 'all';
  
  filteredActivities = allActivities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.title.toLowerCase().includes(searchTerm) ||
      (activity.description && activity.description.toLowerCase().includes(searchTerm)) ||
      (activity.businesses && activity.businesses.name.toLowerCase().includes(searchTerm));
    
    const matchesRange = filterByDateRange(activity, range);
    
    return matchesSearch && matchesRange;
  });
  
  currentPage = 0;
  renderActivities();
}

// Filter by date range
function filterByDateRange(activity, range) {
  if (range === 'all') return true;
  if (!activity.date) return range === 'no-date';
  
  const activityDate = new Date(activity.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (range) {
    case 'upcoming':
      return activityDate >= today;
    case 'past':
      return activityDate < today;
    case 'today':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return activityDate >= today && activityDate < tomorrow;
    default:
      return true;
  }
}

// Render activities with pagination
function renderActivities() {
  const activitiesContainer = document.querySelector('.activities-grid, .events-grid, .bulletin-grid');
  if (!activitiesContainer) return;
  
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const activitiesToShow = filteredActivities.slice(startIndex, endIndex);
  
  if (currentPage === 0) {
    activitiesContainer.innerHTML = '';
  }
  
  activitiesToShow.forEach(activity => {
    const activityCard = createActivityCard(activity);
    activitiesContainer.appendChild(activityCard);
  });
  
  // Show/hide load more button
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = endIndex < filteredActivities.length ? 'block' : 'none';
  }
  
  // Update results count if available
  updateResultsCount();
}

// Update results count display
function updateResultsCount() {
  const countElement = document.querySelector('.results-info span, .results-count');
  if (countElement) {
    countElement.textContent = `Showing ${filteredActivities.length} activities`;
  }
}

// Create activity card
function createActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'activity-card';
  
  const businessName = activity.businesses ? activity.businesses.name : 'Unknown Business';
  const businessLogo = activity.businesses ? activity.businesses.logo_url : null;
  
  card.innerHTML = `
    <div class="activity-image">
      <img src="${activity.cover_image_url || 'images/logo.png'}" alt="${activity.title}" onerror="this.src='images/logo.png'">
      <div class="activity-type-badge ${activity.type}">${activity.type}</div>
    </div>
    
    <div class="activity-content">
      <h3 class="activity-title">${activity.title}</h3>
      
      <div class="activity-business">
        <img src="${businessLogo || 'images/logo.png'}" alt="${businessName}" class="business-logo" onerror="this.src='images/logo.png'">
        <span>${businessName}</span>
      </div>
      
      <p class="activity-description">${activity.description}</p>
      
      <div class="activity-details">
        ${activity.date ? `<div class="activity-date"><i class="fas fa-calendar"></i> ${new Date(activity.date).toLocaleDateString()}</div>` : ''}
        ${activity.time ? `<div class="activity-time"><i class="fas fa-clock"></i> ${activity.time}</div>` : ''}
        ${activity.location ? `<div class="activity-location"><i class="fas fa-map-marker-alt"></i> ${activity.location}</div>` : ''}
      </div>
      
      ${activity.link ? `<a href="${activity.link}" target="_blank" class="activity-link">Learn More <i class="fas fa-external-link-alt"></i></a>` : ''}
    </div>
  `;
  
  // Add click handler to open activity details
  card.addEventListener('click', () => openActivityModal(activity));
  
  return card;
}

// Open activity modal
function openActivityModal(activity) {
  const modal = document.getElementById('modal-overlay');
  if (!modal) return;
  
  const businessName = activity.businesses ? activity.businesses.name : 'Unknown Business';
  const businessLogo = activity.businesses ? activity.businesses.logo_url : null;
  
  // Populate modal with activity data
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalDescription = document.getElementById('modal-description');
  
  if (modalImage) modalImage.src = activity.cover_image_url || 'images/logo.png';
  if (modalTitle) modalTitle.textContent = activity.title;
  if (modalCategory) modalCategory.textContent = `${activity.type} by ${businessName}`;
  if (modalDescription) modalDescription.textContent = activity.description;
  
  // Set up additional modal content if available
  const modalStory = document.getElementById('modal-story');
  if (modalStory) {
    let storyContent = '';
    if (activity.date) storyContent += `<strong>Date:</strong> ${new Date(activity.date).toLocaleDateString()}<br>`;
    if (activity.time) storyContent += `<strong>Time:</strong> ${activity.time}<br>`;
    if (activity.location) storyContent += `<strong>Location:</strong> ${activity.location}<br>`;
    if (activity.link) storyContent += `<strong>More Info:</strong> <a href="${activity.link}" target="_blank">${activity.link}</a>`;
    
    modalStory.innerHTML = storyContent || 'No additional details available.';
  }
  
  // Set up contact buttons
  const whatsappBtn = document.getElementById('modal-whatsapp');
  const emailBtn = document.getElementById('modal-email');
  const websiteBtn = document.getElementById('modal-website');
  
  if (whatsappBtn) whatsappBtn.style.display = 'none';
  if (emailBtn) emailBtn.style.display = 'none';
  if (websiteBtn && activity.link) {
    websiteBtn.href = activity.link;
    websiteBtn.style.display = 'inline-flex';
  } else if (websiteBtn) {
    websiteBtn.style.display = 'none';
  }
  
  modal.style.display = 'flex';
}

// Load more activities
function loadMoreActivities() {
  currentPage++;
  renderActivities();
}

// Global functions for onclick handlers
window.loadMoreActivities = loadMoreActivities;
window.openActivityModal = openActivityModal;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initActivitiesList);
