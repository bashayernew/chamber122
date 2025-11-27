/**
 * Simple Admin Authentication System (No Supabase)
 * Uses localStorage for session management
 */

const ADMIN_EMAIL = 'bashayer@123123';
const ADMIN_PASSWORD = 'bashayer123123';
const SESSION_KEY = 'admin_session';
const USERS_STORAGE_KEY = 'chamber122_users';
const DOCUMENTS_STORAGE_KEY = 'chamber122_documents';
const MESSAGES_STORAGE_KEY = 'chamber122_admin_messages';

/**
 * Check if user is authenticated as admin
 */
export function isAdminAuthenticated() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return false;
  
  try {
    const sessionData = JSON.parse(session);
    // Check if session is expired (24 hours)
    if (Date.now() > sessionData.expires) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return sessionData.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

/**
 * Login admin user
 */
export function adminLogin(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const sessionData = {
      email: email,
      loginTime: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { success: true };
  }
  return { success: false, error: 'Invalid credentials' };
}

/**
 * Logout admin user
 */
export function adminLogout() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Require admin authentication (redirect if not authenticated)
 */
export function requireAdminAuth() {
  if (!isAdminAuthenticated()) {
    window.location.href = '/admin-login.html';
    return false;
  }
  return true;
}

/**
 * Get all users from storage
 */
export function getAllUsers() {
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

/**
 * Save users to storage
 */
export function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

/**
 * Get user by ID
 */
export function getUserById(userId) {
  const users = getAllUsers();
  return users.find(u => u.id === userId);
}

/**
 * Update user status
 */
export function updateUserStatus(userId, status) {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].status = status;
    users[userIndex].updated_at = new Date().toISOString();
    saveUsers(users);
    return true;
  }
  return false;
}

/**
 * Get all documents
 */
export function getAllDocuments() {
  const docsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  return docsJson ? JSON.parse(docsJson) : [];
}

/**
 * Save documents
 */
export function saveDocuments(documents) {
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
}

/**
 * Get documents for a user
 */
export function getDocumentsByUserId(userId) {
  const documents = getAllDocuments();
  return documents.filter(d => d.user_id === userId);
}

/**
 * Get admin messages
 */
export function getAdminMessages() {
  const messagesJson = localStorage.getItem(MESSAGES_STORAGE_KEY);
  return messagesJson ? JSON.parse(messagesJson) : [];
}

/**
 * Save admin messages
 */
export function saveAdminMessages(messages) {
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
}

/**
 * Create admin message
 */
export function createAdminMessage(message) {
  const messages = getAdminMessages();
  const newMessage = {
    id: Date.now().toString(),
    ...message,
    created_at: new Date().toISOString(),
    status: 'open'
  };
  messages.push(newMessage);
  saveAdminMessages(messages);
  return newMessage;
}

/**
 * Remove demo/sample accounts from storage
 */
export function removeDemoAccounts() {
  const users = getAllUsers();
  const documents = getAllDocuments();
  
  // Filter out demo accounts (by email pattern or business name)
  const demoEmails = ['user1@example.com', 'user2@example.com'];
  const demoBusinessNames = ['Sample Business 1', 'Sample Business 2'];
  
  const realUsers = users.filter(user => {
    const isDemoEmail = demoEmails.includes(user.email?.toLowerCase());
    const isDemoBusiness = demoBusinessNames.includes(user.business_name);
    return !isDemoEmail && !isDemoBusiness;
  });
  
  // Get IDs of removed users
  const removedUserIds = users
    .filter(user => {
      const isDemoEmail = demoEmails.includes(user.email?.toLowerCase());
      const isDemoBusiness = demoBusinessNames.includes(user.business_name);
      return isDemoEmail || isDemoBusiness;
    })
    .map(user => user.id);
  
  // Remove documents belonging to demo accounts
  const realDocuments = documents.filter(doc => {
    return !removedUserIds.includes(doc.user_id) && !removedUserIds.includes(doc.business_id);
  });
  
  // Save cleaned data
  if (realUsers.length !== users.length || realDocuments.length !== documents.length) {
    saveUsers(realUsers);
    saveDocuments(realDocuments);
    console.log(`[admin-auth] Removed ${users.length - realUsers.length} demo users and ${documents.length - realDocuments.length} demo documents`);
    return true;
  }
  
  return false;
}

/**
 * Delete a user account and all associated data
 */
export function deleteUser(userId) {
  const users = getAllUsers();
  const documents = getAllDocuments();
  const messages = getAdminMessages();
  
  // Remove user
  const filteredUsers = users.filter(u => u.id !== userId);
  
  // Remove documents associated with this user
  const filteredDocuments = documents.filter(doc => {
    return doc.user_id !== userId && doc.business_id !== userId && doc.owner_id !== userId;
  });
  
  // Remove messages associated with this user
  const filteredMessages = messages.filter(msg => msg.user_id !== userId);
  
  // Save cleaned data
  saveUsers(filteredUsers);
  saveDocuments(filteredDocuments);
  saveAdminMessages(filteredMessages);
  
  console.log(`[admin-auth] Deleted user ${userId} and associated data`);
  return true;
}

/**
 * Initialize sample data (for testing) - Only if explicitly called
 * This is now optional - real data will be captured from signups
 * DISABLED - Do not use
 */
export function initializeSampleData() {
  // Disabled - do not initialize sample data
  return;
}

