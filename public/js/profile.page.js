// Profile page controller - Updated for new database structure
import { toast } from './api.js?v=2';

console.log('[profile.page] Module loaded - SCRIPT IS RUNNING');

let businessId = null;

// DOM elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const ongoingEventsList = document.getElementById('ongoingEventsList');
const pastEventsList = document.getElementById('pastEventsList');
const draftsEventsList = document.getElementById('draftsEventsList');
const businessName = document.getElementById('businessName');
const businessDescription = document.getElementById('businessDescription');
const profileTitle = document.getElementById('profileTitle');

// Initialize immediately
async function init() {
  console.log('[profile.page] Initializing...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    console.log('[profile] DOM still loading, waiting...');
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  await loadProfile();
}

// Load business profile data
async function loadProfile() {
  console.log('[profile] Loading profile...');
  
  try {
    const { supabase } = await import('./supabase-client.global.js');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[profile] User not authenticated:', userError);
      return;
    }

    // Get user's business
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (bizError || !business) {
      console.error('[profile] No business found:', bizError);
      return;
    }

    businessId = business.id;
    console.log('[profile] Business ID:', businessId);

    // Update profile title with business name
    if (profileTitle) {
      profileTitle.textContent = business.name || 'Business Profile';
    }

    // Update business info
    if (businessName) {
      businessName.textContent = business.name || 'Unknown Business';
    }
    if (businessDescription) {
      businessDescription.textContent = business.description || 'No description available';
    }

    // Load events for this business
    await loadProfileEvents(businessId);
    
  } catch (error) {
    console.error('[profile] Error loading profile:', error);
    toast('Failed to load profile', 'error');
  }
}

// Load profile events using events table with business embeds
async function loadProfileEvents(businessId) {
  console.log('[profile-events] Loading profile events for businessId:', businessId);
  
  try {
    const { supabase } = await import('./supabase-client.global.js');
    
    const now = new Date().toISOString();

    // Get all events for this business
    const { data: allEvents = [], error: eventsError } = await supabase
      .from('events')
      .select('id,title,start_at,end_at,cover_image_url,status,is_published,deleted_at,business_id')
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (eventsError) {
      if (window.DEBUG) console.error('[profile-events] Error loading events:', eventsError);
      return;
    }

    if (window.DEBUG) console.log('[profile-events] Loaded events:', allEvents.length);
    
    // Separate into ongoing, past, and drafts
    const ongoingEvents = [];
    const pastEvents = [];
    const draftEvents = [];
    
    (allEvents || []).forEach(event => {
      const startDate = event.start_at ? new Date(event.start_at) : null;
      const endDate = event.end_at ? new Date(event.end_at) : null;
      
      if (event.status === 'draft') {
        draftEvents.push(event);
      } else if (event.is_published) {
        // Check if event is ongoing (hasn't ended yet)
        const isOngoing = endDate ? endDate > new Date(now) : (startDate ? startDate > new Date(now) : true);
        
        if (isOngoing) {
          ongoingEvents.push(event);
        } else {
          pastEvents.push(event);
        }
      }
    });

    // Render events
    renderProfileEvents('ongoingEventsList', ongoingEvents);
    renderProfileEvents('pastEventsList', pastEvents);
    renderProfileEvents('draftsEventsList', draftEvents);
    
  } catch (error) {
    console.error('[profile-events] Error loading profile events:', error);
  }
}

// Render events in the specified container
function renderProfileEvents(targetId, events) {
  const target = document.getElementById(targetId);
  if (!target) return;
  
  if (!events?.length) {
    target.innerHTML = '<p class="text-zinc-500 text-center py-4">No events yet</p>';
    return;
  }
  
  target.innerHTML = events.map(event => `
    <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors mb-3">
      <div class="flex gap-4">
        <div class="flex-shrink-0">
          ${event.cover_image_url ? 
            `<img src="${event.cover_image_url}" alt="${event.title}" class="w-16 h-16 object-cover rounded-lg">` :
            `<div class="w-16 h-16 bg-zinc-700 rounded-lg flex items-center justify-center">
              <i class="fas fa-calendar-alt text-zinc-400"></i>
            </div>`
          }
        </div>
        <div class="flex-1">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                Event
              </span>
              <span class="text-xs px-2 py-1 rounded ${event.status === 'published' ? 'bg-green-600' : 'bg-yellow-600'} text-white">
                ${event.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              ${event.status === 'draft' ? `
                <button onclick="publishEvent('${event.id}')" class="text-green-400 hover:text-green-300 text-sm" title="Publish">
                  <i class="fas fa-eye"></i>
                </button>
              ` : `
                <button onclick="unpublishEvent('${event.id}')" class="text-yellow-400 hover:text-yellow-300 text-sm" title="Unpublish">
                  <i class="fas fa-eye-slash"></i>
                </button>
              `}
              <button onclick="editEvent('${event.id}')" class="text-zinc-400 hover:text-white text-sm" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteEvent('${event.id}')" class="text-red-400 hover:text-red-300 text-sm" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">${event.title || 'Untitled Event'}</h3>
          <div class="flex items-center text-sm text-zinc-400 mb-2">
            <i class="fas fa-calendar w-4 mr-2"></i>
            <span>${formatEventDate(event.start_at, event.end_at)}</span>
          </div>
          <div class="flex justify-between items-center">
            <a href="/event.html?id=${event.id}" class="text-primary hover:text-primary/80 text-sm font-medium">
              View Details
            </a>
            <span class="text-xs text-zinc-500">
              ${formatRelativeTime(event.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Format event date
function formatEventDate(startAt, endAt) {
  if (!startAt) return 'TBA';
  
  const startDate = new Date(startAt);
  const endDate = endAt ? new Date(endAt) : null;
  
  const startStr = startDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  if (endDate) {
    const endStr = endDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${startStr} - ${endStr}`;
  }
  
  return startStr;
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

// Event management functions
window.editEvent = async (eventId) => {
  console.log('[profile-events] Edit event:', eventId);
  window.location.href = `/events.html?edit=${eventId}`;
};

window.publishEvent = async (eventId) => {
  console.log('[profile-events] Publish event:', eventId);
  
  try {
    const { supabase } = await import('./supabase-client.global.js');
    
    const { error } = await supabase
      .from('events')
      .update({ status: 'published', is_published: true })
      .eq('id', eventId);
    
    if (error) {
      console.error('[profile-events] Publish error:', error);
      toast('Failed to publish event', 'error');
      return;
    }
    
    toast('Event published successfully', 'success');
    
    // Reload events
    if (businessId) {
      await loadProfileEvents(businessId);
    }
    
  } catch (error) {
    console.error('[profile-events] Publish error:', error);
    toast('Failed to publish event', 'error');
  }
};

window.unpublishEvent = async (eventId) => {
  console.log('[profile-events] Unpublish event:', eventId);
  
  try {
    const { supabase } = await import('./supabase-client.global.js');
    
    const { error } = await supabase
      .from('events')
      .update({ status: 'draft', is_published: false })
      .eq('id', eventId);
    
    if (error) {
      console.error('[profile-events] Unpublish error:', error);
      toast('Failed to unpublish event', 'error');
      return;
    }
    
    toast('Event unpublished successfully', 'success');
    
    // Reload events
    if (businessId) {
      await loadProfileEvents(businessId);
    }
    
  } catch (error) {
    console.error('[profile-events] Unpublish error:', error);
    toast('Failed to unpublish event', 'error');
  }
};

window.deleteEvent = async (eventId) => {
  console.log('[profile-events] Delete event:', eventId);
  
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { supabase } = await import('./supabase-client.global.js');
    
    const { error } = await supabase
      .from('events')
      .update({ 
        deleted_at: new Date().toISOString(), 
        is_published: false, 
        status: 'draft' 
      })
      .eq('id', eventId);
    
    if (error) {
      console.error('[profile-events] Delete error:', error);
      toast('Failed to delete event', 'error');
      return;
    }
    
    toast('Event deleted successfully', 'success');
    
    // Reload events
    if (businessId) {
      await loadProfileEvents(businessId);
    }
    
  } catch (error) {
    console.error('[profile-events] Delete error:', error);
    toast('Failed to delete event', 'error');
  }
};

// Initialize the page
try {
  init();
} catch (error) {
  console.error('[profile.page] Initialization error:', error);
}