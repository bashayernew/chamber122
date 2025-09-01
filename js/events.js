// Events page functionality
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
  displayEvents(eventsData);
  generateCalendar();
});

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
    sale: 'var(--warning)'
  };
  
  card.innerHTML = `
    <div class="event-image">
      <img src="${event.image}" alt="${event.title}">
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
          <i class="fas fa-clock"></i> ${event.time}
        </span>
        <span class="event-location">
          <i class="fas fa-map-marker-alt"></i> ${event.location}
        </span>
      </div>
      <p class="event-description">${event.description}</p>
      <div class="event-actions">
        <button class="event-btn primary" onclick="showEventDetails(${event.id})">
          Learn More
        </button>
        <button class="event-btn secondary" onclick="contactEvent('${event.contact}')">
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
function openEventForm() {
  document.getElementById('event-form-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close event form modal
function closeEventForm() {
  document.getElementById('event-form-modal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Handle event form submission
document.getElementById('event-submission-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  submitBtn.disabled = true;
  
  setTimeout(() => {
    alert('Thank you for submitting your event! We\'ll review it and get back to you within 24 hours.');
    this.reset();
    closeEventForm();
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 2000);
});

