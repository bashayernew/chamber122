// js/api.js - Backend API helper (replaces Supabase calls)
const API_BASE = '/api';
const TOKEN_KEY = 'session_token';

// Token management
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    ...restOptions
  } = options;
  
  // Remove trailing slash from endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`.replace(/\/+$/, ''); // Remove trailing slash
  const token = getToken();
  
  const config = {
    method,
    credentials: 'include', // For httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...restOptions,
  };
  
  // Add Authorization header if token exists
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add cache-control headers to prevent caching for GET requests
  if (method === 'GET') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body) {
    config.body = body;
    // Remove Content-Type for FormData (browser sets it automatically)
    if (body instanceof FormData) {
      delete config.headers['Content-Type'];
    }
  }
  
  const res = await fetch(url, config);
  
  if (!res.ok) {
    // For 401 on /auth/me, this is expected when not logged in - don't throw, return null-friendly response
    if (res.status === 401 && endpoint.includes('/auth/me')) {
      const httpError = new Error('Not authenticated');
      httpError.status = 401;
      httpError.is401 = true;
      throw httpError;
    }
    
    // For 404 errors, create a more graceful error that can be caught
    if (res.status === 404) {
      const httpError = new Error('Not found');
      httpError.status = 404;
      httpError.is404 = true;
      throw httpError;
    }
    
    // Try to parse JSON error, but handle HTML responses
    let error;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      error = await res.json().catch(() => ({ message: res.statusText }));
    } else {
      error = { message: res.statusText };
    }
    // Handle both { ok: false, error: ... } and { error: ... } formats
    const errorMsg = error.error || error.message || `HTTP ${res.status}`;
    const httpError = new Error(errorMsg);
    httpError.status = res.status;
    httpError.code = error.code; // Preserve error code from backend
    throw httpError;
  }
  
  // Ensure response is JSON
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  } else {
    throw new Error('Expected JSON response but got ' + contentType);
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => apiRequest(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
};

// Export token management
export { getToken, setToken };

// Auth helpers
/**
 * Check if the current user's account is suspended
 * Returns true if suspended, false otherwise
 */
export async function isAccountSuspended() {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Check admin dashboard state first (highest priority)
    const stateKey = 'chamber_admin_dashboard_state';
    const adminState = JSON.parse(localStorage.getItem(stateKey) || '{}');
    const userStatuses = adminState.userStatuses || {};
    const statusFromState = userStatuses[user.id];
    
    if (statusFromState === 'suspended') {
      return true;
    }
    
    // Check user object status
    const { getAllUsers } = await import('./admin-auth.js');
    const users = getAllUsers();
    const userObj = users.find(u => u.id === user.id);
    
    if (userObj && userObj.status === 'suspended') {
      return true;
    }
    
    // Check business status if available
    if (user.business_id) {
      try {
        const businessResponse = await fetch(`${API_BASE}/businesses/${user.business_id}`);
        if (businessResponse.ok) {
          const business = await businessResponse.json();
          if (business.status === 'suspended' || business.is_active === false) {
            return true;
          }
        }
      } catch (err) {
        // Backend not available, continue with local checks
      }
    }
    
    return false;
  } catch (error) {
    console.error('[api] Error checking account status:', error);
    return false; // Default to not suspended if check fails
  }
}

export async function getCurrentUser() {
  try {
    // Try to get user from API (uses token from localStorage via Authorization header)
    const response = await api.get('/auth/me');
    // Handle both { ok: true, user: ... } and { user: ... } formats
    if (response.ok && response.user) {
      // Store business data if available
      if (response.business) {
        response.user.business = response.business;
      }
      return response.user;
    }
    if (response.user) {
      if (response.business) {
        response.user.business = response.business;
      }
      return response.user;
    }
    // If no user, clear token
    setToken(null);
    return null;
  } catch (error) {
    // Return null for 401/404 or network errors (backend unavailable or not logged in)
    // 401 is expected when not logged in, so don't log it as an error
    if (error.status === 401) {
      // Clear token if we get 401 (session expired or not logged in)
      setToken(null);
      return null;
    }
    if (error.status === 404 ||
        error.message?.includes('401') || 
        error.message?.includes('404') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')) {
      // Clear invalid token
      setToken(null);
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

export async function signup(email, password, userData = {}) {
  try {
    console.log('[api] Signup attempt:', { 
      email: email ? email.substring(0, 10) + '...' : 'missing',
      hasPassword: !!password,
      passwordLength: password?.length || 0,
      hasBusinessData: Object.keys(userData).length > 0
    });
    
    const result = await api.post('/auth/signup', {
      email: email.trim(), // Normalize email
      password,
      business_name: userData.business_name || userData.name || email.split('@')[0],
      ...userData
    });
    
    console.log('[api] Signup response:', { 
      ok: result.ok, 
      hasUser: !!result.user, 
      hasToken: !!result.session?.access_token,
      userId: result.user?.id 
    });
    
    // Store token from session.access_token
    if (result.ok && result.session?.access_token) {
      setToken(result.session.access_token);
      console.log('[api] ✅ Token stored in localStorage');
    }
    
    // Handle both { ok: true, user: ... } and { user: ... } formats
    if (result.ok && result.user) {
      console.log('[api] ✅ Signup successful for user:', result.user.email);
      return { user: result.user, token: result.session?.access_token };
    }
    
    // If result has error, throw it
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[api] Signup error:', error);
    throw error;
  }
}

export async function login(email, password) {
  try {
    console.log('[api] Attempting login for:', email ? email.substring(0, 5) + '...' : 'missing email');
    const result = await api.post('/auth/login', {
      email: email.trim(),
      password
    });
    console.log('[api] Login response:', { ok: result.ok, hasUser: !!result.user, hasToken: !!result.session?.access_token });
    
    // Store token from session.access_token
    if (result.ok && result.session?.access_token) {
      setToken(result.session.access_token);
      console.log('[api] Token stored in localStorage');
    }
    
    // Handle both { ok: true, user: ... } and { user: ... } formats
    if (result.ok && result.user) {
      return { user: result.user, token: result.session?.access_token };
    }
    
    // If result has error, throw it
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[api] Login error:', error);
    // Re-throw with better error message
    if (error.status === 401) {
      // Check if it's a user not found error (by code or message)
      if (error.code === 'USER_NOT_FOUND' || error.message?.includes('USER_NOT_FOUND') || error.message?.includes('signed up') || error.message?.includes('create an account')) {
        const notFoundError = new Error('Account not found. Please sign up first to create an account.');
        notFoundError.code = 'USER_NOT_FOUND';
        throw notFoundError;
      }
      // Preserve the original error message from backend
      throw new Error(error.message || 'Invalid email or password. Please check your credentials.');
    }
    throw error;
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('[logout] Error:', error);
  } finally {
    // Always clear token from localStorage
    setToken(null);
  }
}

// Business helpers
export async function getMyBusiness(forceFresh = false) {
  try {
    // Add cache-busting parameter to ensure fresh data
    const timestamp = forceFresh ? Date.now() + Math.random() : Date.now();
    const response = await api.get(`/business/me?_=${timestamp}`);
    console.log('[api] getMyBusiness response:', response);
    // Handle both { business } and { ok: true, business } formats
    const business = response.business ?? null;
    console.log('[api] getMyBusiness returning business:', business ? 'Found' : 'Not found');
    
    // Log key fields to verify data freshness
    if (business) {
      console.log('[api] Business data:', {
        name: business.name || business.business_name,
        description: business.description ? business.description.substring(0, 50) + '...' : 'None',
        logo_url: business.logo_url ? 'Yes' : 'No',
        updated_at: business.updated_at
      });
    }
    
    return business;
  } catch (error) {
    console.error('[api] getMyBusiness error:', error);
    // If 404, return null (no business found)
    if (error.status === 404) {
      return null;
    }
    return null;
  }
}

export async function getBusinessById(businessId) {
  try {
    const response = await api.get(`/businesses/${businessId}`);
    // Handle both { business } and { ok: true, business } formats
    return response.business ?? null;
  } catch (error) {
    console.error('[api] getBusinessById error:', error);
    // If 404, return null (no business found)
    if (error.status === 404) {
      return null;
    }
    return null;
  }
}

export async function upsertBusiness(businessData) {
  const { business } = await api.post('/business/upsert', businessData);
  return business;
}

// Events helpers
export async function getPublicEvents() {
  try {
    const response = await api.get('/events');
    console.log('[api] getPublicEvents response:', response);
    const events = response.events || response.data || [];
    console.log('[api] getPublicEvents returning:', events.length, 'events');
    return events;
  } catch (error) {
    console.error('[api] getPublicEvents error:', error);
    return [];
  }
}

export async function getEventById(eventId) {
  try {
    const { event } = await api.get(`/events/${eventId}`);
    return event;
  } catch {
    return null;
  }
}

export async function createEvent(eventData) {
  try {
    const response = await api.post('/events', eventData);
    if (!response.event) {
      throw new Error('Event creation failed: No event returned');
    }
    return response.event;
  } catch (error) {
    console.error('[api] createEvent error:', error);
    throw error;
  }
}

export async function registerForEvent(eventId, registrationData) {
  const { registration } = await api.post(`/events/${eventId}/register`, registrationData);
  return registration;
}

// Bulletins helpers
export async function getPublicBulletins() {
  try {
    const result = await api.get('/bulletins');
    // Handle both { ok: true, bulletins: [...] } and { bulletins: [...] } formats
    const bulletins = result.bulletins || result || [];
    
    // Store in localStorage for fallback
    if (bulletins.length > 0) {
      try {
        localStorage.setItem('chamber122_bulletins', JSON.stringify(bulletins));
      } catch (e) {
        console.warn('[api] Could not store bulletins in localStorage:', e);
      }
    }
    
    return bulletins;
  } catch (error) {
    console.error('[api] getPublicBulletins error:', error);
    
    // Try localStorage fallback for 404 errors
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Failed to fetch')) {
      try {
        const stored = localStorage.getItem('chamber122_bulletins');
        if (stored) {
          const bulletins = JSON.parse(stored);
          console.log(`[api] Loaded ${bulletins.length} bulletins from localStorage fallback`);
          return bulletins;
        }
      } catch (e) {
        console.warn('[api] Error reading bulletins from localStorage:', e);
      }
    }
    
    return [];
  }
}

export async function getBulletinById(bulletinId) {
  try {
    const { bulletin } = await api.get(`/bulletins/${bulletinId}`);
    return bulletin;
  } catch {
    return null;
  }
}

export async function registerForBulletin(bulletinId, registrationData) {
  const { registration } = await api.post(`/bulletins/${bulletinId}/register`, registrationData);
  return registration;
}

export async function createBulletin(bulletinData) {
  try {
    const result = await api.post('/bulletins', bulletinData);
    return result.bulletin || result;
  } catch (error) {
    // Re-throw with status for proper error handling
    if (error.status === 401) {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      throw authError;
    }
    throw error;
  }
}

export async function getMyBulletins() {
  try {
    const { bulletins } = await api.get('/dashboard/my-bulletins');
    return bulletins || [];
  } catch {
    return [];
  }
}

// File upload helper
export async function uploadFile(file, type = 'general', businessId = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('document_type', type); // Also send as document_type for business_media table
  if (businessId) {
    formData.append('business_id', businessId);
  }
  
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Upload failed: ${res.status}`);
  }
  
  const result = await res.json();
  // Return with publicUrl alias for compatibility
  return {
    ...result,
    publicUrl: result.public_url || result.path
  };
}
