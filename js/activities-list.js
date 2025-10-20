// Activities List Management - Classic Script
(function() {
  'use strict';
  
  // Run once guard
  if (window.__activitiesList_loaded__) return;
  window.__activitiesList_loaded__ = true;
  
  // Wait for Supabase to be ready
  function waitForSupabase(callback) {
    if (window.sb) {
      callback();
    } else {
      window.addEventListener('supabaseReady', callback);
    }
  }
  
  // Get Supabase client
  function getSupabase() {
    const client = window.supa || window.sb || window.supabase;
    if (!client) {
      throw new Error('Supabase client not available. Make sure supabase-client.global.js is loaded.');
    }
    return client;
  }
  
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
      const sb = getSupabase();
      const { data, error } = await sb
        .from('activities')               // VIEW (RLS-friendly)
        .select('*')
        .eq('status', 'published')
        .eq('is_published', true)
        .order('created_at', { ascending: false })  // Valid column
        .limit(100);
      
      if (error) throw error;
      
      allActivities = data || [];
      filteredActivities = [...allActivities];
    } catch (error) {
      console.error('Error loading activities:', error);
      // Show empty state
      allActivities = [];
      filteredActivities = [];
    }
  }

  // Fetch activities feed
  async function fetchActivitiesFeed({ limit = 20, from = 0, kind = null, businessId = null } = {}) {
    const sb = getSupabase();
    let query = sb
      .from('activities')               // VIEW (RLS-friendly)
      .select('*')
      .eq('status', 'published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })  // Valid column
      .range(from, from + limit - 1);

    if (kind) {
      query = query.eq('kind', kind);  // Use 'kind' from VIEW
    }

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    return query;
  }

  // Fetch events feed (for events page)
  async function fetchEventsFeed({ limit = 20, from = 0 } = {}) {
    return fetchActivitiesFeed({ limit, from, kind: 'event' });
  }

  // Fetch dashboard feed (all activities)
  async function fetchDashboardFeed({ limit = 20, from = 0 } = {}) {
    return fetchActivitiesFeed({ limit, from });
  }

  // Fetch owner activities (for profile page)
  async function fetchOwnerActivities(businessId, { limit = 50, from = 0 } = {}) {
    return fetchActivitiesFeed({ limit, from, businessId });
  }

  // Setup event listeners
  function setupEventListeners() {
    const searchInput = document.getElementById('q');
    const rangeSelect = document.getElementById('range');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (searchInput) {
      searchInput.addEventListener('input', filterActivities);
    }
    
    if (rangeSelect) {
      rangeSelect.addEventListener('change', filterActivities);
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadMoreActivities);
    }
  }

  // Load more activities function
  function loadMoreActivities() {
    currentPage++;
    renderActivities();
  }

  // Filter activities based on search and date range
  function filterActivities() {
    const searchTerm = document.getElementById('q')?.value?.toLowerCase() || '';
    const range = document.getElementById('range')?.value || 'all';
    
    filteredActivities = allActivities.filter(activity => {
      const matchesSearch = !searchTerm || 
        (activity.title && activity.title.toLowerCase().includes(searchTerm)) ||
        (activity.description && activity.description.toLowerCase().includes(searchTerm));
      
      const matchesRange = filterByDateRange(activity, range);
      
      return matchesSearch && matchesRange;
    });
    
    currentPage = 0;
    renderActivities();
  }

  // Filter by date range
  function filterByDateRange(activity, range) {
    if (range === 'all') return true;
    if (!activity.start_at) return range === 'no-date';
    
    const activityDate = new Date(activity.start_at);
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
    const activitiesContainer = document.querySelector('.activities-grid, .events-grid, .bulletin-grid, #events-grid, #bulletin-grid');
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
    
    // Wire activity clicks (only once)
    wireActivityClicks();
  }

  // Update results count display
  function updateResultsCount() {
    const countElement = document.querySelector('.results-info span, .results-count');
    if (countElement) {
      countElement.textContent = `Showing ${filteredActivities.length} activities`;
    }
  }

  // Wire activity clicks (delegated event handling)
  function wireActivityClicks() {
    const list = document.querySelector('#activities-list, .activities-grid, .events-grid, .bulletin-grid, #events-grid, #bulletin-grid');
    if (!list || list._wired) return;

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button');

      // Learn More button
      if (btn?.classList.contains('learn-more')) {
        const link = (btn.dataset.link || '').trim();
        const id = (btn.dataset.id || '').trim();
        if (link) {
          window.open(link, '_blank', 'noopener');
        } else if (id) {
          window.location.href = `/event.html?id=${encodeURIComponent(id)}`;
        } else {
          alert('No details available.');
        }
        return;
      }

      // Contact button
      if (btn?.classList.contains('contact')) {
        const email = (btn.dataset.email || '').trim();
        const phone = (btn.dataset.phone || '').trim();
        if (email) {
          window.location.href = `mailto:${email}`;
        } else if (phone) {
          window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
        } else {
          alert('No contact info available.');
        }
        return;
      }

      // Clicking the card (but not the buttons) opens detail
      const card = e.target.closest('.activity-card, .event-card, .bulletin-card');
      if (card && !e.target.closest('.card-actions, .event-actions')) {
        const id = card.dataset.id;
        if (id) {
          window.location.href = `/event.html?id=${encodeURIComponent(id)}`;
        }
      }
    });

    list._wired = true;
  }

  // Create activity card
  function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.setAttribute('data-id', activity.id);
    
    const title = String(activity.title ?? '');
    const coverUrl = activity.cover_url || 'images/logo.png';
    
    // Determine card type based on kind
    const cardType = activity.kind === 'bulletin' ? 'bulletin-card' : 'event-card';
    card.className = cardType;
    
    // Create appropriate card HTML based on type
    if (activity.kind === 'bulletin') {
      card.innerHTML = createBulletinCardHTML(activity);
    } else {
      card.innerHTML = createEventCardHTML(activity);
    }

    return card;
  }

  // Create event card HTML
  function createEventCardHTML(activity) {
    const eventDate = activity.start_at ? new Date(activity.start_at) : new Date();
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const time = activity.start_at ? new Date(activity.start_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : 'TBA';
    
    return `
      <div class="event-image">
        <img src="${activity.cover_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop'}" alt="${activity.title || 'Event'}">
        <div class="event-type-badge">Event</div>
      </div>
      <div class="event-details">
        <h3>${activity.title || 'Untitled Event'}</h3>
        <div class="event-meta">
          <span class="event-date">
            <i class="fas fa-calendar"></i> ${formattedDate}
          </span>
          <span class="event-time">
            <i class="fas fa-clock"></i> ${time}
          </span>
          <span class="event-location">
            <i class="fas fa-map-marker-alt"></i> ${activity.location || 'Location TBA'}
          </span>
        </div>
        <p class="event-description">${activity.description || 'No description available.'}</p>
        <div class="event-actions">
          <button class="event-btn primary learn-more" data-id="${activity.id}" data-link="${activity.link || ''}">
            Learn More
          </button>
          <button class="event-btn secondary contact" data-email="${activity.contact_email || ''}" data-phone="${activity.contact_phone || ''}">
            Contact
          </button>
        </div>
      </div>
    `;
  }

  // Create bulletin card HTML
  function createBulletinCardHTML(activity) {
    const typeLabels = {
      announcement: 'Announcement',
      job: 'Job',
      training: 'Training',
      funding: 'Funding'
    };

    const typeColors = {
      announcement: 'type-announcement',
      job: 'type-job',
      training: 'type-training',
      funding: 'type-funding'
    };

    const description = activity.description || '';
    const preview = description.length > 280 ? description.substring(0, 280) + '...' : description;
    
    const deadline = activity.end_at ? formatDate(activity.end_at) : null;
    const location = activity.location || null;
    
    return `
      <div class="bulletin-header">
        <div>
          <h3 class="bulletin-title">${escapeHtml(activity.title)}</h3>
          <span class="type-pill ${typeColors[activity.type] || 'type-announcement'}">
            ${typeLabels[activity.type] || 'Announcement'}
          </span>
        </div>
      </div>
      
      <p class="bulletin-description">${escapeHtml(preview)}</p>
      
      <div class="bulletin-meta">
        ${location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}</span>` : ''}
        ${deadline ? `<span><i class="fas fa-calendar"></i> Deadline: ${deadline}</span>` : ''}
        <span><i class="fas fa-clock"></i> ${formatDate(activity.created_at)}</span>
      </div>
    `;
  }

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Reload activities (for external calls)
  async function reloadActivities() {
    await loadActivities();
    renderActivities();
  }

  // Initialize activities page
  function initActivitiesPage() {
    console.log('Initializing activities page...');
    waitForSupabase(() => {
      initActivitiesList();
    });
  }

  // Global functions for external access
  window.loadMoreActivities = loadMoreActivities;
  window.reloadActivities = reloadActivities;
  window.fetchEventsFeed = fetchEventsFeed;
  window.fetchDashboardFeed = fetchDashboardFeed;
  window.fetchOwnerActivities = fetchOwnerActivities;
  window.initActivitiesPage = initActivitiesPage;
  
  // Auto-initialize if on activities page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivitiesPage);
  } else {
    initActivitiesPage();
  }
})();