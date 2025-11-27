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
  // Only return approved businesses
  const publicBusinesses = businesses.filter(b => 
    b.status === 'approved' && b.is_active !== false
  );
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
    return events.filter(e => e.status === 'published' || e.is_published);
  } catch (e) {
    return [];
  }
}

// Create event (replaces /api/events/create)
export async function createEvent(eventData) {
  const user = requireAuth();
  try {
    const stored = localStorage.getItem('chamber122_events');
    const events = stored ? JSON.parse(stored) : [];
    
    const event = {
      id: generateId(),
      owner_id: user.id,
      business_id: user.business ? user.business.id : null,
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
    const bulletins = stored ? JSON.parse(stored) : [];
    return bulletins.filter(b => b.status === 'published' || b.is_published);
  } catch (e) {
    return [];
  }
}

// Create bulletin (replaces /api/bulletins)
export async function createBulletin(bulletinData) {
  const user = requireAuth();
  try {
    const stored = localStorage.getItem('chamber122_bulletins');
    const bulletins = stored ? JSON.parse(stored) : [];
    
    const bulletin = {
      id: generateId(),
      owner_id: user.id,
      business_id: user.business ? user.business.id : null,
      business_name: user.business ? user.business.name : null,
      ...bulletinData,
      status: 'published',
      is_published: true,
      created_at: new Date().toISOString()
    };
    
    bulletins.push(bulletin);
    localStorage.setItem('chamber122_bulletins', JSON.stringify(bulletin));
    return { bulletin: bulletin };
  } catch (e) {
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
    const stored = localStorage.getItem('chamber122_bulletin_registrations');
    const registrations = stored ? JSON.parse(stored) : [];
    
    const registration = {
      id: generateId(),
      bulletin_id: bulletinId,
      ...registrationData,
      created_at: new Date().toISOString()
    };
    
    registrations.push(registration);
    localStorage.setItem('chamber122_bulletin_registrations', JSON.stringify(registrations));
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
