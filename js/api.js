// js/api.js - localStorage-based API replacement (no backend, no Supabase)
// All functions now use localStorage instead of API calls

import {
  getCurrentUser as getCurrentUserFromAuth,
  getCurrentSession,
  getAllUsers,
  getAllBusinesses,
  saveBusinesses,
  getBusinessByOwner,
  getBusinessById,
  updateBusiness,
  generateId,
  isAdmin,
  requireAuth
} from './auth-localstorage.js';

// File to base64 conversion
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Mock API response format for compatibility
function createResponse(data, ok = true) {
  return {
    ok: ok,
    ...data
  };
}

// Get current user (replaces /api/auth/me)
export async function getCurrentUser() {
  try {
    return getCurrentUserFromAuth();
  } catch (e) {
    return null;
  }
}

// Login (replaces /api/auth/login)
export async function login(email, password) {
  const { login: loginFunc } = await import('./auth-localstorage.js');
  try {
    const result = loginFunc(email, password);
    return createResponse({
      user: result.user,
      business: result.business,
      session: result.session
    });
  } catch (error) {
    const err = new Error(error.message || 'Login failed');
    err.status = 401;
    throw err;
  }
}

// Signup (replaces /api/auth/signup)
export async function signup(email, password, businessData) {
  const { signup: signupFunc } = await import('./auth-localstorage.js');
  try {
    const result = signupFunc(email, password, businessData);
    return createResponse({
      user: result.user,
      business: result.business,
      session: result.session
    });
  } catch (error) {
    const err = new Error(error.message || 'Signup failed');
    err.status = 400;
    throw err;
  }
}

// Logout (replaces /api/auth/logout)
export async function logout() {
  const { logout: logoutFunc } = await import('./auth-localstorage.js');
  logoutFunc();
  return createResponse({ message: 'Logged out' });
}

// Get public businesses (replaces /api/businesses/public)
export async function getPublicBusinesses() {
  const businesses = getAllBusinesses();
  // Return ALL businesses except explicitly suspended ones
  // Show pending, approved, or businesses with no status
  const publicBusinesses = businesses.filter(b => {
    // Exclude only if explicitly suspended
    if (b.status === 'suspended') return false;
    // Exclude only if explicitly inactive
    if (b.is_active === false) return false;
    // Include everything else (pending, approved, or no status)
    return true;
  });
  console.log('[api] getPublicBusinesses: Total businesses in localStorage:', businesses.length, 'Public (non-suspended):', publicBusinesses.length);
  if (businesses.length > 0) {
    console.log('[api] Sample businesses:', businesses.slice(0, 3).map(b => ({ id: b.id, name: b.name || b.business_name, status: b.status || 'no status', is_active: b.is_active })));
  }
  return createResponse({ businesses: publicBusinesses });
}

// Get user's business (replaces /api/business/me)
export async function getMyBusiness() {
  const user = requireAuth();
  const business = getBusinessByOwner(user.id);
  return createResponse({ 
    business: business || null,
    media: business && business.gallery_urls ? business.gallery_urls.map((url, idx) => ({
      id: idx.toString(),
      business_id: business.id,
      public_url: url,
      file_type: 'image',
      created_at: business.created_at
    })) : []
  });
}

// Upsert business (replaces /api/business/upsert)
export async function upsertBusiness(businessData) {
  const user = requireAuth();
  const businesses = getAllBusinesses();
  let business = getBusinessByOwner(user.id);
  
  if (business) {
    // Update existing
    business = updateBusiness(business.id, businessData);
  } else {
    // Create new
    business = {
      id: generateId(),
      owner_id: user.id,
      ...businessData,
      created_at: new Date().toISOString()
    };
    businesses.push(business);
    saveBusinesses(businesses);
  }
  
  return business;
}

// Upload file (converts to base64, replaces /api/upload)
export async function uploadFile(file, type, businessId) {
  try {
    const base64 = await fileToBase64(file);
    return {
      publicUrl: base64,
      public_url: base64,
      url: base64,
      path: base64
    };
  } catch (error) {
    throw new Error('File upload failed: ' + error.message);
  }
}

// Get all events (replaces /api/events)
export async function getPublicEvents() {
  try {
    const stored = localStorage.getItem('chamber122_events');
    const events = stored ? JSON.parse(stored) : [];
    const filtered = events.filter(e => e.status === 'published' || e.is_published);
    
    // Enrich events with business information if missing
    const enriched = filtered.map(event => {
      // If event already has business_name, return as is
      if (event.business_name && event.business_logo_url) {
        return event;
      }
      
      // Try to get business info from business_id
      if (event.business_id) {
        const business = getBusinessById(event.business_id);
        if (business) {
          return {
            ...event,
            business_name: event.business_name || business.name || business.business_name || 'Unknown Business',
            business_logo_url: event.business_logo_url || business.logo_url || null
          };
        }
      }
      
      // Try to get business info from owner_id
      if (event.owner_id) {
        const business = getBusinessByOwner(event.owner_id);
        if (business) {
          return {
            ...event,
            business_id: event.business_id || business.id,
            business_name: event.business_name || business.name || business.business_name || 'Unknown Business',
            business_logo_url: event.business_logo_url || business.logo_url || null
          };
        }
      }
      
      // Return event with defaults if no business found
      return {
        ...event,
        business_name: event.business_name || 'Unknown Business',
        business_logo_url: event.business_logo_url || null
      };
    });
    
    return enriched;
  } catch (e) {
    console.error('[api] Error loading events:', e);
    return [];
  }
}

// Get event by ID
export async function getEventById(eventId) {
  try {
    const stored = localStorage.getItem('chamber122_events');
    const events = stored ? JSON.parse(stored) : [];
    return events.find(e => e.id === eventId) || null;
  } catch (e) {
    return null;
  }
}

// Register for event
export async function registerForEvent(eventId, registrationData) {
  try {
    // Get current user ID if logged in
    let userId = null;
    try {
      const user = getCurrentUserFromAuth();
      if (user) userId = user.id;
    } catch (e) {
      // User not logged in, that's okay
    }
    
    const stored = localStorage.getItem('chamber122_event_registrations');
    const registrations = stored ? JSON.parse(stored) : [];
    
    const registration = {
      id: generateId(),
      event_id: eventId,
      user_id: userId, // Save user ID if logged in
      ...registrationData,
      created_at: new Date().toISOString()
    };
    
    registrations.push(registration);
    localStorage.setItem('chamber122_event_registrations', JSON.stringify(registrations));
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('registration-completed', { detail: { type: 'event', registration } }));
    
    return registration;
  } catch (e) {
    throw new Error('Failed to register for event: ' + e.message);
  }
}

// Create event (replaces /api/events/create)
export async function createEvent(eventData) {
  const user = requireAuth();
  try {
    // Get user's business to attach business info
    const business = getBusinessByOwner(user.id);
    
    const stored = localStorage.getItem('chamber122_events');
    const events = stored ? JSON.parse(stored) : [];
    
    const event = {
      id: generateId(),
      owner_id: user.id,
      business_id: business ? business.id : (user.business ? user.business.id : null),
      business_name: business ? (business.name || business.business_name) : (eventData.business_name || 'Unknown Business'),
      business_logo_url: business ? business.logo_url : (eventData.business_logo_url || null),
      ...eventData,
      status: 'published',
      is_published: true,
      created_at: new Date().toISOString()
    };
    
    events.push(event);
    localStorage.setItem('chamber122_events', JSON.stringify(events));
    return event;
  } catch (e) {
    throw new Error('Failed to create event: ' + e.message);
  }
}

// Get all bulletins (replaces /api/bulletins)
export async function getPublicBulletins() {
  try {
    const stored = localStorage.getItem('chamber122_bulletins');
    if (!stored) {
      return [];
    }
    
    let bulletins = [];
    try {
      const parsed = JSON.parse(stored);
      // Ensure it's an array - if it's a single object, wrap it in an array
      if (Array.isArray(parsed)) {
        bulletins = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Single bulletin object - wrap it in an array
        bulletins = [parsed];
        // Fix localStorage to store as array
        localStorage.setItem('chamber122_bulletins', JSON.stringify(bulletins));
      } else {
        bulletins = [];
      }
    } catch (parseError) {
      console.error('[api] Error parsing bulletins from localStorage:', parseError);
      return [];
    }
    
    // Filter published bulletins, but also include those without explicit status (for backwards compatibility)
    const published = bulletins.filter(b => {
      // If status is explicitly set, check it
      if (b.status !== undefined) {
        return b.status === 'published';
      }
      // If is_published is set, check it
      if (b.is_published !== undefined) {
        return b.is_published === true;
      }
      // If neither is set, assume published (for backwards compatibility)
      return true;
    });
    console.log('[api] getPublicBulletins: Total:', bulletins.length, 'Published:', published.length);
    return published;
  } catch (e) {
    console.error('[api] Error loading bulletins:', e);
    return [];
  }
}

// Create bulletin (replaces /api/bulletins)
export async function createBulletin(bulletinData) {
  const user = requireAuth();
  try {
    // Get user's business
    const { getBusinessByOwner } = await import('./auth-localstorage.js');
    const business = getBusinessByOwner(user.id);
    
    const stored = localStorage.getItem('chamber122_bulletins');
    let bulletins = [];
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure it's an array - if it's a single object, wrap it in an array
        if (Array.isArray(parsed)) {
          bulletins = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Single bulletin object - wrap it in an array
          bulletins = [parsed];
        } else {
          bulletins = [];
        }
      } catch (parseError) {
        console.error('[api] Error parsing existing bulletins:', parseError);
        bulletins = [];
      }
    }
    
    const bulletin = {
      id: generateId(),
      owner_id: user.id,
      business_id: business ? business.id : (bulletinData.business_id || null),
      business_name: business ? (business.name || business.business_name) : (bulletinData.business_name || null),
      ...bulletinData,
      status: bulletinData.status || 'published',
      is_published: bulletinData.is_published !== undefined ? bulletinData.is_published : true,
      created_at: new Date().toISOString()
    };
    
    bulletins.push(bulletin);
    // CRITICAL FIX: Save the entire array, not just the single bulletin!
    localStorage.setItem('chamber122_bulletins', JSON.stringify(bulletins));
    console.log('[api] Created bulletin:', bulletin.id, 'Total bulletins:', bulletins.length);
    return { bulletin: bulletin };
  } catch (e) {
    console.error('[api] Error creating bulletin:', e);
    throw new Error('Failed to create bulletin: ' + e.message);
  }
}

// Get bulletin by ID
export async function getBulletinById(bulletinId) {
  try {
    const stored = localStorage.getItem('chamber122_bulletins');
    const bulletins = stored ? JSON.parse(stored) : [];
    return bulletins.find(b => b.id === bulletinId) || null;
  } catch (e) {
    return null;
  }
}

// Register for bulletin
export async function registerForBulletin(bulletinId, registrationData) {
  try {
    // Get current user ID if logged in
    let userId = null;
    try {
      const user = getCurrentUserFromAuth();
      if (user) userId = user.id;
    } catch (e) {
      // User not logged in, that's okay
    }
    
    const stored = localStorage.getItem('chamber122_bulletin_registrations');
    const registrations = stored ? JSON.parse(stored) : [];
    
    const registration = {
      id: generateId(),
      bulletin_id: bulletinId,
      user_id: userId, // Save user ID if logged in
      ...registrationData,
      created_at: new Date().toISOString()
    };
    
    registrations.push(registration);
    localStorage.setItem('chamber122_bulletin_registrations', JSON.stringify(registrations));
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('registration-completed', { detail: { type: 'bulletin', registration } }));
    
    return { registration: registration };
  } catch (e) {
    throw new Error('Failed to register: ' + e.message);
  }
}

// List businesses for owner
export async function listBusinessesForOwner(ownerId) {
  const businesses = getAllBusinesses();
  return businesses.filter(b => b.owner_id === ownerId);
}

// Get owner business ID
export async function getOwnerBusinessId(ownerId) {
  const business = getBusinessByOwner(ownerId);
  return business ? business.id : null;
}

// API helper functions (for compatibility)
// Check if account is suspended
export async function isAccountSuspended() {
  try {
    const user = getCurrentUserFromAuth();
    if (!user) {
      return false; // Not logged in, can't be suspended
    }
    
    const business = getBusinessByOwner(user.id);
    if (!business) {
      return false; // No business, can't be suspended
    }
    
    // Check if business status is 'suspended'
    const status = business.status || business.is_active;
    return status === 'suspended' || status === false;
  } catch (error) {
    console.error('[api] Error checking account suspension:', error);
    return false; // Default to not suspended on error
  }
}

export const api = {
  get: async (endpoint) => {
    // Handle different endpoints
    if (endpoint === '/auth/me') {
      const user = await getCurrentUser();
      return createResponse({ user: user });
    }
    if (endpoint === '/businesses/public') {
      return await getPublicBusinesses();
    }
    if (endpoint === '/business/me') {
      return await getMyBusiness();
    }
    if (endpoint === '/events') {
      const events = await getPublicEvents();
      return createResponse({ events: events });
    }
    if (endpoint === '/bulletins') {
      const bulletins = await getPublicBulletins();
      return createResponse({ bulletins: bulletins });
    }
    throw new Error('Endpoint not found: ' + endpoint);
  },
  
  post: async (endpoint, data) => {
    if (endpoint === '/auth/login') {
      return await login(data.email, data.password);
    }
    if (endpoint === '/auth/signup') {
      return await signup(data.email, data.password, data);
    }
    if (endpoint === '/business/upsert') {
      return await upsertBusiness(data);
    }
    if (endpoint === '/events/create') {
      return await createEvent(data);
    }
    if (endpoint === '/bulletins') {
      return await createBulletin(data);
    }
    throw new Error('Endpoint not found: ' + endpoint);
  }
};
