// js/auth-localstorage.js - Pure localStorage-based authentication (no backend, no Supabase)

const STORAGE_KEY_USERS = 'chamber122_users';
const STORAGE_KEY_SESSION = 'chamber122_session';
const STORAGE_KEY_BUSINESSES = 'chamber122_businesses';
const STORAGE_KEY_EVENTS = 'chamber122_events';
const STORAGE_KEY_BULLETINS = 'chamber122_bulletins';
const STORAGE_KEY_MESSAGES = 'chamber122_messages';

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get all users from localStorage
export function getAllUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save users to localStorage
function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('[auth] Error saving users:', e);
  }
}

// Get all businesses from localStorage
export function getAllBusinesses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BUSINESSES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save businesses to localStorage
export function saveBusinesses(businesses) {
  try {
    localStorage.setItem(STORAGE_KEY_BUSINESSES, JSON.stringify(businesses));
  } catch (e) {
    console.error('[auth] Error saving businesses:', e);
  }
}

// Get current session
export function getCurrentSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!stored) return null;
    const session = JSON.parse(stored);
    // Check if session is expired (7 days)
    if (session.expires && Date.now() > session.expires) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

// Ensure admin account exists (called on module load)
function ensureAdminAccount() {
  const users = getAllUsers();
  const adminExists = users.some(u => u.role === 'admin');
  
  if (!adminExists) {
    const adminUser = {
      id: generateId(),
      email: 'admin@admin.com',
      password: 'admin123',
      role: 'admin',
      status: 'approved',
      created_at: new Date().toISOString()
    };
    users.push(adminUser);
    saveUsers(users);
    console.log('[auth] Auto-created admin account: admin@admin.com / admin123');
  }
}

// Initialize admin account check
ensureAdminAccount();

// Get current user
export function getCurrentUser() {
  const session = getCurrentSession();
  if (!session || !session.userId) return null;
  
  const users = getAllUsers();
  const user = users.find(u => u.id === session.userId);
  if (!user) {
    // Session exists but user doesn't - clear session
    localStorage.removeItem(STORAGE_KEY_SESSION);
    return null;
  }
  
  // Get user's business
  const businesses = getAllBusinesses();
  const business = businesses.find(b => b.owner_id === user.id);
  
  return {
    ...user,
    business: business || null
  };
}

// Signup - create new user
export function signup(email, password, businessData) {
  const users = getAllUsers();
  
  // Check if user already exists
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('Email already exists');
  }
  
  // Create user
  const userId = generateId();
  const user = {
    id: userId,
    email: email.toLowerCase().trim(),
    password: password, // In production, hash this - for now store plain text
    role: 'msme',
    created_at: new Date().toISOString(),
    status: 'pending'
  };
  
  users.push(user);
  saveUsers(users);
  
  // Create business
  const businessId = generateId();
  const businesses = getAllBusinesses();
  const business = {
    id: businessId,
    owner_id: userId,
    name: businessData.business_name || businessData.name || email.split('@')[0],
    business_name: businessData.business_name || businessData.name || email.split('@')[0],
    description: businessData.description || null,
    short_description: businessData.short_description || businessData.description || null,
    story: businessData.story || null,
    industry: businessData.industry || businessData.category || null,
    category: businessData.category || businessData.industry || null,
    country: businessData.country || 'Kuwait',
    city: businessData.city || null,
    area: businessData.area || null,
    block: businessData.block || null,
    street: businessData.street || null,
    floor: businessData.floor || null,
    office_no: businessData.office_no || null,
    phone: businessData.phone || null,
    whatsapp: businessData.whatsapp || null,
    website: businessData.website || null,
    instagram: businessData.instagram || null,
    logo_url: businessData.logo_url || null,
    is_active: true,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  businesses.push(business);
  saveBusinesses(businesses);
  
  // Create session
  const session = {
    userId: userId,
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  
  return {
    user: user,
    business: business,
    session: session
  };
}

// Login
export function login(email, password) {
  const users = getAllUsers();
  const user = users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password
  );
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Create session
  const session = {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  
  // Get user's business
  const businesses = getAllBusinesses();
  const business = businesses.find(b => b.owner_id === user.id);
  
  return {
    user: user,
    business: business || null,
    session: session
  };
}

// Logout
export function logout() {
  localStorage.removeItem(STORAGE_KEY_SESSION);
}

// Check if user is authenticated
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

// Require authentication (throws if not authenticated)
export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// Check if user is admin
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Update user
export function updateUser(userId, updates) {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
  saveUsers(users);
  return users[index];
}

// Update business
export function updateBusiness(businessId, updates) {
  const businesses = getAllBusinesses();
  const index = businesses.findIndex(b => b.id === businessId);
  if (index === -1) return null;
  
  businesses[index] = { ...businesses[index], ...updates, updated_at: new Date().toISOString() };
  saveBusinesses(businesses);
  return businesses[index];
}

// Get business by owner ID
export function getBusinessByOwner(ownerId) {
  const businesses = getAllBusinesses();
  return businesses.find(b => b.owner_id === ownerId) || null;
}

// Get business by ID
export function getBusinessById(businessId) {
  const businesses = getAllBusinesses();
  return businesses.find(b => b.id === businessId) || null;
}

