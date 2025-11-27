/**
 * Admin Test Data Helper
 * Use this to manually add test users for testing the admin dashboard
 * Call addTestUser() from browser console to add a test user
 */

import { saveUsers, saveDocuments, getAllUsers } from './admin-auth.js';

/**
 * Add a test user manually (for testing purposes)
 * Usage: In browser console, run:
 *   import('./js/admin-test-data.js').then(m => m.addTestUser())
 */
export function addTestUser() {
  const users = getAllUsers();
  
  const testUser = {
    id: `test_${Date.now()}`,
    email: `test${users.length + 1}@example.com`,
    name: `Test User ${users.length + 1}`,
    phone: `+965${Math.floor(Math.random() * 10000000)}`,
    business_name: `Test Business ${users.length + 1}`,
    industry: ['Retail', 'Services', 'Technology', 'Food'][Math.floor(Math.random() * 4)],
    city: 'Kuwait City',
    country: 'Kuwait',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  users.push(testUser);
  saveUsers(users);
  
  console.log('Test user added:', testUser);
  return testUser;
}

/**
 * Add test documents for a user
 */
export function addTestDocuments(userId) {
  const documents = [
    {
      id: `doc_${Date.now()}_1`,
      user_id: userId,
      business_id: userId,
      kind: 'civil_id_front',
      file_url: '#',
      file_name: 'civil_id_front.pdf',
      file_size: 102400,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: `doc_${Date.now()}_2`,
      user_id: userId,
      business_id: userId,
      kind: 'civil_id_back',
      file_url: '#',
      file_name: 'civil_id_back.pdf',
      file_size: 102400,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: `doc_${Date.now()}_3`,
      user_id: userId,
      business_id: userId,
      kind: 'owner_proof',
      file_url: '#',
      file_name: 'owner_proof.pdf',
      file_size: 102400,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ];
  
  const existingDocs = JSON.parse(localStorage.getItem('chamber122_documents') || '[]');
  existingDocs.push(...documents);
  localStorage.setItem('chamber122_documents', JSON.stringify(existingDocs));
  
  console.log('Test documents added for user:', userId);
  return documents;
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  window.addTestUser = addTestUser;
  window.addTestDocuments = addTestDocuments;
}







