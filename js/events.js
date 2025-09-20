// Events page functionality
import { supabase } from './supabase-client.js';

let currentView = 'grid';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Sample events data
const eventsData = [
  {
    id: 1,
    title: "MSME Networking Night",
    type: "networking",
    date: "2025-01-31",
    time: "19:00",
    location: "Kuwait Chamber of Commerce",
    description: "Join fellow MSME owners for an evening of networking, knowledge sharing, and community building. Light refreshments provided.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop",
    contact: "events@chamber122.com"
  },
  {
    id: 2,
    title: "Digital Marketing Workshop",
    type: "training",
    date: "2025-02-05",
    time: "14:00",
    location: "Online",
    description: "Learn essential digital marketing strategies for small businesses. Topics include social media marketing, SEO basics, and online advertising.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=300&fit=crop",
    contact: "+965-12345678"
  },
  {
    id: 3,
    title: "Valentine's Day Special Offers",
    type: "promotion",
    date: "2025-02-14",
    time: "10:00",
    location: "Various Locations",
    description: "Special Valentine's Day promotions from our MSME community. Discounts on flowers, chocolates, gifts, and romantic dinner packages.",
    image: "https://images.unsplash.com/photo-1518057111178-9a2d1ac9e1fe?w=500&h=300&fit=crop",
    contact: "promotions@chamber122.com"
  },
  {
    id: 4,
    title: "Spring Market Fair",
    type: "market",
    date: "2025-03-15",
    time: "09:00",
    location: "Kuwait City Central Park",
    description: "Annual spring market featuring local MSMEs. Showcase your products, meet customers, and enjoy live entertainment.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop",
    contact: "market@chamber122.com"
  },
  {
    id: 5,
    title: "Financial Planning for MSMEs",
    type: "training",
    date: "2025-02-20",
    time: "18:00",
    location: "Hawally Business Center",
    description: "Essential financial planning strategies for growing your MSME. Learn about budgeting, cash flow management, and investment planning.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&h=300&fit=crop",
    contact: "training@chamber122.com"
  }
];

// Initialize events page
document.addEventListener('DOMContentLoaded', function() {
  loadEvents();
});

// --- SAFE INIT START ---
function q(sel) { return document.querySelector(sel); }

export function safeInitCalendar() {
  // Support multiple naming schemes (ids or data-attrs)
  const el = {
    container: q('[data-cal="container"], #calendar'),
    grid:      q('[data-cal="grid"], #calendar-grid, .calendar-grid'),
    prev:      q('[data-cal="prev"], #calendar-prev, #cal-prev, .calendar-prev'),
    next:      q('[data-cal="next"], #calendar-next, #cal-next, .calendar-next'),
    month:     q('[data-cal="month"], #calendar-month, #cal-month, .calendar-month'),
  };

  const missing = Object.entries(el).filter(([, node]) => !node).map(([k]) => k);
  if (missing.length) {
    console.warn('Calendar elements missing; skipping calendar init →', missing);
    return; // no-op on pages without a calendar
  }

  // TODO: plug your existing calendar rendering here.
  // Example skeleton:
  // renderMonth(el.grid, currentYear, currentMonth);
  // el.prev.addEventListener('click', () => { /* update month + render */ });
  // el.next.addEventListener('click', () => { /* update month + render */ });

  console.debug('[events] calendar initialized');
}

// auto-init on pages that have the markup
document.addEventListener('DOMContentLoaded', safeInitCalendar);
// --- SAFE INIT END ---

// Load events from database
async function loadEvents() {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .or('status.eq.published,is_published.is.true')
      .or(`end_at.is.null,end_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      displayEvents(data);
    } else {
      // Fallback to sample data if no events in database
      displayEvents(eventsData);
    }
  } catch (error) {
    console.error('Error loading events:', error);
    // Fallback to sample data on error
    displayEvents(eventsData);
  }
}

// Filter events
function filterEvents() {
  const dateFilter = document.getElementById('date-filter').value;
  const typeFilter = document.getElementById('type-filter').value;
  const locationFilter = document.getElementById('location-filter').value;
  
  let filtered = eventsData.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const thisWeekEnd = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Date filter
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = eventDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'this-week') {
      matchesDate = eventDate >= today && eventDate <= thisWeekEnd;
    } else if (dateFilter === 'this-month') {
      matchesDate = eventDate >= today && eventDate <= thisMonthEnd;
    } else if (dateFilter === 'upcoming') {
      matchesDate = eventDate >= today;
    }
    
    // Type filter
    const matchesType = !typeFilter || event.type === typeFilter;
    
    // Location filter
    const matchesLocation = !locationFilter || 
      event.location.toLowerCase().includes(locationFilter.replace('-', ' ')) ||
      (locationFilter === 'online' && event.location.toLowerCase() === 'online');
    
    return matchesDate && matchesType && matchesLocation;
  });
  
  displayEvents(filtered);
}

// Switch between grid and calendar view
function switchView(view) {
  currentView = view;
  
  // Update button states
  document.getElementById('grid-view-btn').classList.toggle('active', view === 'grid');
  document.getElementById('calendar-view-btn').classList.toggle('active', view === 'calendar');
  
  // Show/hide sections
  document.getElementById('events-grid-view').classList.toggle('hidden', view !== 'grid');
  document.getElementById('events-calendar-view').classList.toggle('hidden', view !== 'calendar');
}

// Display events in grid
function displayEvents(events) {
  const grid = document.getElementById('events-grid');
  
  if (!grid) {
    console.warn('Events grid element not found');
    return;
  }
  
  grid.innerHTML = '';
  
  if (events.length === 0) {
    grid.innerHTML = '<p class="no-results">No events found matching your criteria.</p>';
    return;
  }
  
  events.forEach(event => {
    const card = createEventCard(event);
    grid.appendChild(card);
  });
}

// Create event card
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const typeColors = {
    networking: 'var(--gold)',
    training: 'var(--success)',
    promotion: 'var(--warning)',
    market: 'var(--bronze)',
    workshop: 'var(--gold)',
    sale: 'var(--warning)',
    conference: 'var(--gold)',
    exhibition: 'var(--bronze)',
    other: 'var(--gold)'
  };
  
  // Handle both sample data and database data
  const imageUrl = event.image || event.cover_image_url || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop';
  const contact = event.contact || event.contact_email || event.contact_phone || 'Contact organizer';
  const time = event.time || 'TBA';
  const location = event.location || 'Location TBA';
  
  card.innerHTML = `
    <div class="event-image">
      <img src="${imageUrl}" alt="${event.title}">
      <div class="event-type-badge" style="background: ${typeColors[event.type] || 'var(--gold)'}">
        ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}
      </div>
    </div>
    <div class="event-details">
      <h3>${event.title}</h3>
      <div class="event-meta">
        <span class="event-date">
          <i class="fas fa-calendar"></i> ${formattedDate}
        </span>
        <span class="event-time">
          <i class="fas fa-clock"></i> ${time}
        </span>
        <span class="event-location">
          <i class="fas fa-map-marker-alt"></i> ${location}
        </span>
      </div>
      <p class="event-description">${event.description || 'No description available.'}</p>
      <div class="event-actions">
        <button class="event-btn primary" onclick="showEventDetails(${event.id})">
          Learn More
        </button>
        <button class="event-btn secondary" onclick="contactEvent('${contact}')">
          Contact
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Generate calendar
function generateCalendar() {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYear = document.getElementById('calendar-month-year');
  
  // Safety checks
  if (!calendarGrid || !monthYear) {
    console.warn('Calendar elements not found');
    return;
  }
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  monthYear.textContent = `${months[currentMonth]} ${currentYear}`;
  
  // Clear previous calendar
  calendarGrid.innerHTML = '';
  
  // Add day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    calendarGrid.appendChild(header);
  });
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyDay);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    // Check if there are events on this day
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayEvents = eventsData.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === dayDate.toDateString();
    });
    
    if (dayEvents.length > 0) {
      dayElement.classList.add('has-events');
      dayElement.onclick = () => showDayEvents(dayEvents);
    }
    
    // Highlight today
    const today = new Date();
    if (dayDate.toDateString() === today.toDateString()) {
      dayElement.classList.add('today');
    }
    
    calendarGrid.appendChild(dayElement);
  }
}

// Navigate calendar
function previousMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  generateCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  generateCalendar();
}

// Show day events
function showDayEvents(events) {
  alert(`Events on this day:\n${events.map(e => `• ${e.title} at ${e.time}`).join('\n')}`);
}

// Show event details
function showEventDetails(eventId) {
  const event = eventsData.find(e => e.id === eventId);
  if (event) {
    alert(`Event: ${event.title}\nDate: ${event.date}\nTime: ${event.time}\nLocation: ${event.location}\n\nDescription: ${event.description}\n\nContact: ${event.contact}`);
  }
}

// Contact event organizer
function contactEvent(contact) {
  if (contact.includes('@')) {
    window.location.href = `mailto:${contact}`;
  } else if (contact.includes('+')) {
    window.location.href = `https://wa.me/${contact.replace(/[^0-9]/g, '')}`;
  } else {
    alert(`Contact: ${contact}`);
  }
}

// Open event form modal
export function openEventForm() {
  console.log('openEventForm called');
  const modal = document.getElementById('event-form-modal');
  console.log('Modal element:', modal);
  
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadUserBusinesses();
    console.log('Event form modal opened');
  } else {
    console.error('Event form modal not found!');
  }
}

// Close event form modal
function closeEventForm() {
  const modal = document.getElementById('event-form-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetEventForm();
  }
}

// Load user's businesses for the dropdown
async function loadUserBusinesses() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      hideBusinessSelection();
      return;
    }

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    const businessSelect = document.getElementById('event-business');
    if (businessSelect) {
      businessSelect.innerHTML = '<option value="">Select a business...</option>';
      
      if (businesses && businesses.length > 0) {
        businesses.forEach(business => {
          const option = document.createElement('option');
          option.value = business.id;
          option.textContent = business.name;
          businessSelect.appendChild(option);
        });
      } else {
        businessSelect.innerHTML = '<option value="">No businesses found. Please create a business first.</option>';
        businessSelect.disabled = true;
      }
    }
  } catch (error) {
    console.error('Error loading businesses:', error);
    hideBusinessSelection();
  }
}

// Hide business selection for guests
function hideBusinessSelection() {
  const businessSelection = document.getElementById('business-selection');
  if (businessSelection) {
    businessSelection.style.display = 'none';
  }
}

// Reset event form
function resetEventForm() {
  const form = document.getElementById('event-creation-form');
  if (form) {
    form.reset();
  }
  
  const statusMessage = document.getElementById('event-status-message');
  if (statusMessage) {
    statusMessage.style.display = 'none';
    statusMessage.textContent = '';
  }
}

// Show status message
function showStatusMessage(message, type = 'info') {
  const statusMessage = document.getElementById('event-status-message');
  if (statusMessage) {
    statusMessage.style.display = 'block';
    statusMessage.textContent = message;
    statusMessage.style.backgroundColor = type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff';
    statusMessage.style.color = '#fff';
  }
}

// Handle event form submission
async function handleEventSubmission() {
  const form = document.getElementById('event-creation-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-event');
  const originalText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.textContent = 'Creating...';
  submitBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    const title = formData.get('title').trim();
    const date = formData.get('date');
    const type = formData.get('type');
    const businessId = formData.get('business_id');

    if (!title) throw new Error('Event title is required');
    if (!date) throw new Error('Event date is required');
    if (!type) throw new Error('Event type is required');
    if (!businessId) throw new Error('Please select a business');

    // Prepare event data
    const eventData = {
      created_by: user.id,
      business_id: businessId,
      type: type,
      title: title,
      description: formData.get('description').trim() || null,
      date: date,
      time: formData.get('time') || null,
      end_date: formData.get('end_date') || null,
      end_time: formData.get('end_time') || null,
      location: formData.get('location').trim() || null,
      contact_email: formData.get('contact_email').trim() || null,
      contact_phone: formData.get('contact_phone').trim() || null,
      link: formData.get('link').trim() || null,
      status: 'published' // For authenticated users with businesses
    };

    // Handle image upload if provided
    const imageFile = formData.get('cover_image');
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/events/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business-media')
        .upload(fileName, imageFile, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: publicUrl } = supabase.storage
        .from('business-media')
        .getPublicUrl(fileName);
      
      eventData.cover_image_url = publicUrl.publicUrl;
    }

    // Insert event into database
    const { data, error } = await supabase
      .from('activities')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;

    // Success
    showStatusMessage('Event created successfully! It\'s now live on the site.', 'success');
    
    // Close modal after a short delay
    setTimeout(() => {
      closeEventForm();
      // Refresh the events list
      loadEvents();
    }, 1500);

  } catch (error) {
    console.error('Error creating event:', error);
    showStatusMessage('Failed to create event: ' + error.message, 'error');
  } finally {
    // Restore button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Event form modal listeners
  const eventModal = document.getElementById('event-form-modal');
  const closeBtn = document.getElementById('close-event-modal');
  const cancelBtn = document.getElementById('cancel-event');
  const submitBtn = document.getElementById('submit-event');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeEventForm);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeEventForm);
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', handleEventSubmission);
  }

  // Close modal when clicking outside
  if (eventModal) {
    eventModal.addEventListener('click', function(e) {
      if (e.target === eventModal) {
        closeEventForm();
      }
    });
  }
});

