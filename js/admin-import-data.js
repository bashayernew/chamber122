/**
 * Admin Data Import - Fetches real businesses from API and imports to admin system
 */

import { saveUsers, saveDocuments, getAllUsers } from './admin-auth.js';
import { api } from './api.js';

// API base URL - use port 4000 for backend server
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000/api' 
  : '/api';

// Track if admin API is available (to avoid repeated 404 spam)
let ADMIN_API_AVAILABLE = true; // true = available, false = unavailable (set to false when we hit 404s)

/**
 * Fetch all businesses from API (admin endpoint)
 */
async function fetchAllBusinessesFromAPI() {
  try {
    // If we know admin API is unavailable, skip it and go straight to public endpoint
    if (ADMIN_API_AVAILABLE === false) {
      console.log('[admin-import] Admin API not available, using public endpoint only');
      return await fetchPublicBusinesses();
    }
    
    // Try multiple endpoints and formats
    const endpoints = [
      '/businesses/admin',
      '/businesses/all',
      '/businesses/public'
    ];
    
    for (const endpoint of endpoints) {
      try {
        // Try using api helper first
        try {
          const response = await api.get(endpoint);
          
          // Handle different response formats
          let businesses = null;
          if (response.ok && response.businesses) {
            businesses = response.businesses;
          } else if (response.businesses) {
            businesses = response.businesses;
          } else if (Array.isArray(response)) {
            businesses = response;
          } else if (response.data && Array.isArray(response.data)) {
            businesses = response.data;
          }
          
          if (businesses && businesses.length > 0) {
            console.log(`[admin-import] Fetched ${businesses.length} businesses from ${endpoint}`);
            // Mark admin API as available if we got data from admin/all endpoints
            if (endpoint.includes('admin') || endpoint.includes('all')) {
              ADMIN_API_AVAILABLE = true;
            }
            return businesses;
          }
        } catch (apiErr) {
          // If 404, mark admin API as unavailable and continue
          if (apiErr.status === 404 || apiErr.message?.includes('404')) {
            if (endpoint.includes('admin') || endpoint.includes('all')) {
              ADMIN_API_AVAILABLE = false;
              console.log('[admin-import] Admin API not available (404), falling back to public endpoint');
            }
            console.debug(`[admin-import] API helper failed for ${endpoint} (404), trying next endpoint`);
            continue;
          }
          console.debug(`[admin-import] API helper failed for ${endpoint}, trying direct fetch`);
        }
        
        // Try direct fetch to port 4000
        try {
          const directResponse = await fetch(`${API_BASE_URL}${endpoint}`);
          if (directResponse.ok) {
            const data = await directResponse.json();
            const businesses = data.businesses || data.ok?.businesses || data.data || [];
            if (businesses && businesses.length > 0) {
              console.log(`[admin-import] Fetched ${businesses.length} businesses from ${API_BASE_URL}${endpoint}`);
              if (endpoint.includes('admin') || endpoint.includes('all')) {
                ADMIN_API_AVAILABLE = true;
              }
              return businesses;
            }
          } else if (directResponse.status === 404) {
            // Mark admin API as unavailable if we get 404 from admin/all endpoints
            if (endpoint.includes('admin') || endpoint.includes('all')) {
              ADMIN_API_AVAILABLE = false;
              console.log('[admin-import] Admin API not available (404), falling back to public endpoint');
            }
          }
        } catch (fetchErr) {
          // Network errors are fine, just continue
          console.debug(`[admin-import] Direct fetch failed for ${endpoint}:`, fetchErr.message);
        }
      } catch (err) {
        console.debug(`[admin-import] Endpoint ${endpoint} failed:`, err.message);
        continue;
      }
    }
    
    // Final fallback: try public endpoint
    return await fetchPublicBusinesses();
  } catch (error) {
    console.error('[admin-import] Error fetching businesses:', error);
    return [];
  }
}

/**
 * Fetch businesses from public endpoint (always available fallback)
 */
async function fetchPublicBusinesses() {
  try {
    const directResponse = await fetch(`${API_BASE_URL}/businesses/public`);
    if (directResponse.ok) {
      const data = await directResponse.json();
      const businesses = data.businesses || data.ok?.businesses || data.data || [];
      if (businesses.length > 0) {
        console.log(`[admin-import] Fetched ${businesses.length} businesses from public endpoint`);
        return businesses;
      }
    }
  } catch (err) {
    console.debug('[admin-import] Public endpoint fetch failed:', err.message);
  }
  
  // Last resort: try relative path
  try {
    const directResponse = await fetch('/api/businesses/public');
    if (directResponse.ok) {
      const data = await directResponse.json();
      const businesses = data.businesses || data.ok?.businesses || data.data || [];
      if (businesses.length > 0) {
        console.log(`[admin-import] Fetched ${businesses.length} businesses via relative path`);
        return businesses;
      }
    }
  } catch (err) {
    console.debug('[admin-import] Relative path fetch failed:', err.message);
  }
  
  return [];
}

/**
 * Fetch documents for businesses from backend API
 */
async function fetchDocumentsForBusinesses(businessIds) {
  try {
    if (!businessIds || businessIds.length === 0) {
      return [];
    }
    
    console.log('[admin-import] Fetching documents for', businessIds.length, 'businesses');
    const allDocuments = [];
    
    // Fetch media/documents for each business
    for (const businessId of businessIds) {
      try {
        // Try to fetch from /api/business/{id} which includes media
        const response = await fetch(`${API_BASE_URL}/businesses/${businessId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const business = data.business || data;
          const media = business.media || data.media || [];
          
          // Log ALL media items BEFORE filtering to see what we have
          console.log(`[admin-import] 🔍 Business ${businessId} - ALL ${media.length} media items:`, 
            media.map(m => ({
              id: m.id,
              document_type: m.document_type || 'NULL',
              type: m.type || 'NULL',
              kind: m.kind || 'NULL',
              file_type: m.file_type || 'NULL',
              public_url: m.public_url ? m.public_url.substring(0, 50) + '...' : 'NO_URL',
              allKeys: Object.keys(m)
            }))
          );
          
          // Filter for document types (not gallery/logo)
          // Include ALL document types - don't filter out any
          const documents = media.filter(m => {
            const docType = m.document_type || m.type || m.kind;
            
            // Log each media item for debugging
            if (!docType) {
              console.log(`[admin-import] ❌ Media ${m.id} has no document_type/type/kind. Keys:`, Object.keys(m));
              return false;
            }
            
            const docTypeLower = docType.toLowerCase();
            const excludedTypes = ['gallery', 'logo', null, ''];
            const isExcluded = excludedTypes.includes(docTypeLower);
            
            if (isExcluded) {
              console.log(`[admin-import] ⏭️ Excluding media ${m.id} with type: "${docType}"`);
            } else {
              console.log(`[admin-import] ✅ Including media ${m.id} with type: "${docType}"`);
            }
            
            return !isExcluded;
          });
          
          console.log(`[admin-import] 📊 Business ${businessId} summary:`, {
            totalMedia: media.length,
            documentsFound: documents.length,
            documentTypes: documents.map(d => d.document_type || d.type || d.kind),
            allMediaTypes: media.map(m => m.document_type || m.type || m.kind || 'NO_TYPE')
          });
          
          // Log if no documents found but media exists
          if (media.length > 0 && documents.length === 0) {
            console.error(`[admin-import] ⚠️⚠️⚠️ Business ${businessId} has ${media.length} media items but 0 documents!`, {
              allMediaTypes: media.map(m => ({
                id: m.id,
                document_type: m.document_type || 'NULL',
                type: m.type || 'NULL',
                kind: m.kind || 'NULL',
                file_type: m.file_type || 'NULL',
                public_url: m.public_url ? 'YES' : 'NO'
              }))
            });
          }
          
          // Log detailed media information
          const mediaDetails = media.map(m => ({
            id: m.id,
            document_type: m.document_type,
            type: m.type,
            kind: m.kind,
            file_type: m.file_type,
            public_url: m.public_url ? m.public_url.substring(0, 60) : 'no url',
            allKeys: Object.keys(m)
          }));
          
          console.log(`[admin-import] Business ${businessId} media details:`, {
            total: media.length,
            documents: documents.length,
            documentTypes: documents.map(d => d.document_type || d.type || d.kind),
            allMediaTypes: media.map(m => m.document_type || m.type || m.kind || 'NO_TYPE'),
            mediaDetails: mediaDetails
          });
          
          // Log if no documents found but media exists
          if (media.length > 0 && documents.length === 0) {
            console.warn(`[admin-import] ⚠️ Business ${businessId} has ${media.length} media items but 0 documents!`, {
              mediaTypes: media.map(m => ({
                id: m.id,
                document_type: m.document_type || 'NULL',
                type: m.type || 'NULL',
                kind: m.kind || 'NULL',
                file_type: m.file_type || 'NULL'
              }))
            });
          }
          
          // Map document types from backend to admin types
          const docTypeMapping = {
            'license': 'license', // Keep as license (will show as License)
            'iban': 'iban', // Keep as iban (will show as IBAN Certificate)
            'articles': 'articles', // Keep as articles (will show as Articles of Incorporation)
            'signature_auth': 'signature_auth', // Keep as signature_auth
            'civil_id_front': 'civil_id_front',
            'civil_id_back': 'civil_id_back',
            'owner_proof': 'owner_proof'
          };
          
          // Convert to admin document format
          documents.forEach(doc => {
            const backendType = doc.document_type || doc.type || doc.kind;
            const adminType = docTypeMapping[backendType] || backendType;
            
            // Get file URL - try multiple fields
            const fileUrl = doc.public_url || doc.url || doc.file_url || doc.path || '#';
            
            // Skip if no valid URL
            if (!fileUrl || fileUrl === '#') {
              console.warn(`[admin-import] Document ${doc.id} has no valid URL, skipping`);
              return;
            }
            
            allDocuments.push({
              id: doc.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: business.owner_id || business.owner_user_id,
              business_id: businessId,
              kind: adminType,
              file_url: fileUrl,
              file_name: doc.file_name || doc.name || `${adminType}.pdf`,
              file_size: doc.file_size || doc.size || 0,
              uploaded_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
              created_at: doc.created_at || new Date().toISOString()
            });
            
            console.log(`[admin-import] Added document: ${adminType} for user ${business.owner_id} - URL: ${fileUrl.substring(0, 50)}...`);
          });
          
          console.log(`[admin-import] Found ${documents.length} documents for business ${businessId}`);
        }
      } catch (err) {
        console.warn(`[admin-import] Could not fetch documents for business ${businessId}:`, err);
      }
    }
    
    console.log('[admin-import] Total documents fetched:', allDocuments.length);
    return allDocuments;
  } catch (error) {
    console.warn('[admin-import] Could not fetch documents:', error);
    return [];
  }
}

/**
 * Import businesses from API to admin system
 */
export async function importBusinessesFromAPI() {
  try {
    console.log('[admin-import] Fetching businesses from API...');
    console.log('[admin-import] API Base URL:', API_BASE_URL);
    
    const businesses = await fetchAllBusinessesFromAPI();
    
    if (!businesses || businesses.length === 0) {
      // In standalone mode, it's OK to have no businesses - just use localStorage data
      if (ADMIN_API_AVAILABLE === false) {
        console.log('[admin-import] No businesses from API (standalone mode), using existing localStorage data');
        return { imported: 0, updated: 0, total: getAllUsers().length };
      }
      console.log('[admin-import] No businesses found in API');
      const error = new Error('No businesses found. Make sure the backend server is running on port 4000 (cd server && node index.js)');
      error.code = 'NO_BUSINESSES';
      throw error;
    }
    
    console.log(`[admin-import] Found ${businesses.length} businesses`);
    
    const existingUsers = getAllUsers();
    const existingEmails = new Set(existingUsers.map(u => u.email));
    
    // Create a map of existing users by ID for quick lookup
    const existingUsersById = new Map();
    // Also create a map by real email (not fake ones)
    const existingUsersByRealEmail = new Map();
    existingUsers.forEach(u => {
      if (u.id) {
        existingUsersById.set(u.id, u);
      }
      // Map by real email (not fake @chamber122.com emails)
      if (u.email && !u.email.includes('@chamber122.com')) {
        existingUsersByRealEmail.set(u.email.toLowerCase(), u);
      }
    });
    
    console.log('[admin-import] Existing users:', {
      total: existingUsers.length,
      withRealEmails: Array.from(existingUsersByRealEmail.keys()),
      withFakeEmails: existingUsers.filter(u => u.email && u.email.includes('@chamber122.com')).length
    });
    
    let imported = 0;
    let updated = 0;
    
    // Fetch user information for all owner IDs
    const ownerIds = businesses.map(b => b.owner_id || b.owner_user_id || b.user_id).filter(Boolean);
    const userInfoMap = new Map();
    
    // Try to fetch user emails from backend API (only if admin API is available)
    if (ADMIN_API_AVAILABLE !== false) {
      for (const ownerId of ownerIds) {
        try {
          // Try to get user info from /api/users/{id} or /api/auth/users/{id}
          const userResponse = await fetch(`${API_BASE_URL}/users/${ownerId}`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
            }
          }).catch(() => null);
          
          if (userResponse && userResponse.ok) {
            const userData = await userResponse.json();
            const user = userData.user || userData;
            if (user && user.email) {
              userInfoMap.set(ownerId, {
                email: user.email,
                name: user.name || user.full_name || user.display_name || '',
                phone: user.phone || ''
              });
              console.log(`[admin-import] Found user info for ${ownerId}: ${user.email}`);
            }
          } else if (userResponse && userResponse.status === 404) {
            // If we get 404, mark admin API as unavailable and stop trying
            ADMIN_API_AVAILABLE = false;
            console.log('[admin-import] User API endpoint not available (404), using fallback data');
            break; // Stop trying other user IDs
          }
        } catch (err) {
          // Network errors are fine, just continue
          if (err.status === 404 || err.message?.includes('404')) {
            ADMIN_API_AVAILABLE = false;
            console.log('[admin-import] User API endpoint not available (404), using fallback data');
            break;
          }
          console.debug(`[admin-import] Could not fetch user info for ${ownerId}:`, err.message);
        }
      }
    } else {
      console.log('[admin-import] Skipping user API calls (admin API unavailable), using business data only');
    }
    
      // Convert businesses to user format
    // Load admin dashboard state to check for local status overrides
    const stateKey = 'chamber_admin_dashboard_state';
    const localState = JSON.parse(localStorage.getItem(stateKey) || '{}');
    
    const usersToSave = businesses.map((business, index) => {
      // Get backend status from business
      let backendStatus = 'pending';
      if (business.status) {
        backendStatus = business.status;
      } else if (business.is_active === true || business.is_active === 'true') {
        backendStatus = 'approved';
      } else if (business.is_active === false || business.is_active === 'false') {
        backendStatus = 'pending';
      }
      
      // Get owner information (try multiple fields)
      const ownerId = business.owner_id || business.owner_user_id || business.user_id;
      const userId = ownerId || `user_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get local status from admin dashboard state (check both userId and existing user's status)
      let localStatus = (localState.userStatuses || {})[userId];
      
      // Also check if there's an existing user with this ID and use their status as fallback
      const existingUserById = ownerId ? existingUsersById.get(ownerId) : null;
      if (!localStatus && existingUserById && existingUserById.status) {
        localStatus = existingUserById.status;
        console.log(`[admin-import] Using status from existing user object for ${userId}: ${localStatus}`);
      }
      
      console.log(`[admin-import] Status resolution for user ${userId}:`, {
        backendStatus,
        localStatus: localStatus || 'none',
        adminApiAvailable: ADMIN_API_AVAILABLE,
        hasLocalState: !!localState.userStatuses,
        localStateKeys: localState.userStatuses ? Object.keys(localState.userStatuses) : []
      });
      
      // Resolve status: prefer local status when admin API is unavailable
      let effectiveStatus;
      if (localStatus) {
        if (!ADMIN_API_AVAILABLE) {
          // In standalone / no-admin-API mode, trust what the admin changed in the dashboard
          console.warn('[admin-import] Status mismatch for user', userId, ': backend=', backendStatus, ', localStorage=', localStatus, '. Preferring LOCAL status (admin override) because admin API is unavailable.');
          effectiveStatus = localStatus;
        } else if (localStatus !== backendStatus) {
          // In real backend mode, trust the backend
          console.warn('[admin-import] Status mismatch for user', userId, ': backend=', backendStatus, ', localStorage=', localStatus, '. Preferring BACKEND status because admin API is available.');
          effectiveStatus = backendStatus;
        } else {
          // They match
          effectiveStatus = backendStatus;
        }
      } else {
        // No local override stored, just use backend/public status
        effectiveStatus = backendStatus;
      }
      
      // Check if user already exists in localStorage with this ID - preserve their real email!
      // (existingUserById was already declared above for status checking)
      
      // Also check if there's a user with a real email that might match this business
      // (in case the ID changed but email stayed the same)
      let existingUserByEmail = null;
      if (business.owner_email && !business.owner_email.includes('@chamber122.com')) {
        existingUserByEmail = existingUsersByRealEmail.get(business.owner_email.toLowerCase());
      }
      
      // Get user info from map if available, otherwise use fallbacks
      const userInfo = userInfoMap.get(ownerId);
      
      // Priority: 1) Existing user's real email (by ID or email), 2) API user info, 3) Business data, 4) Fake email
      let ownerEmail;
      const existingUser = existingUserById || existingUserByEmail;
      
      if (existingUser?.email && !existingUser.email.includes('@chamber122.com')) {
        // Use real email from existing user
        ownerEmail = existingUser.email;
        console.log(`[admin-import] Using existing real email for ${ownerId}: ${ownerEmail} (found by ${existingUserById ? 'ID' : 'email'})`);
      } else {
        // Try to get from API or business data
        ownerEmail = userInfo?.email || business.owner_email || business.email || business.owner?.email || `business_${business.id}@chamber122.com`;
        if (ownerEmail.includes('@chamber122.com')) {
          console.warn(`[admin-import] Using fake email for ${ownerId}: ${ownerEmail}`);
        } else {
          console.log(`[admin-import] Using email from API/business: ${ownerEmail}`);
        }
      }
      
      const ownerName = existingUser?.name || userInfo?.name || business.owner_name || business.owner?.name || business.owner?.full_name || business.name || '';
      const ownerPhone = existingUser?.phone || userInfo?.phone || business.phone || business.whatsapp || business.owner?.phone || '';
      
      const userData = {
        id: userId,
        email: ownerEmail,
        name: ownerName,
        phone: ownerPhone,
        business_name: business.name || business.business_name || business.display_name || business.legal_name || `Business ${business.id}`,
        industry: business.industry || business.category || '',
        city: business.city || '',
        country: business.country || 'Kuwait',
        status: effectiveStatus, // Use resolved status
        created_at: business.created_at || new Date().toISOString(),
        updated_at: business.updated_at || new Date().toISOString(),
        // Store business ID for reference
        business_id: business.id,
        // Store additional business data
        description: business.description || business.short_description || '',
        whatsapp: business.whatsapp || '',
        website: business.website || '',
        logo_url: business.logo_url || ''
      };
      
      // Check if user already exists (by ID first, then email, then business_id)
      const existingIndex = existingUsers.findIndex(u => 
        u.id === userData.id || // Match by user ID first (most reliable)
        (userData.id && u.id === userData.id) ||
        (userData.email && u.email === userData.email && !userData.email.includes('@chamber122.com')) || // Match by real email (not fake ones)
        u.business_id === business.id
      );
      
      if (existingIndex !== -1) {
        // Update existing user - preserve real email if it exists
        const existingUser = existingUsers[existingIndex];
        const preservedEmail = existingUser.email && !existingUser.email.includes('@chamber122.com') 
          ? existingUser.email 
          : (userData.email && !userData.email.includes('@chamber122.com') ? userData.email : existingUser.email);
        
        console.log(`[admin-import] Found existing user:`, {
          id: existingUser.id,
          oldEmail: existingUser.email,
          newEmail: userData.email,
          preservedEmail: preservedEmail
        });
        
        // Check admin dashboard state for status override FIRST
        const stateKey = 'chamber_admin_dashboard_state';
        const adminState = JSON.parse(localStorage.getItem(stateKey) || '{}');
        const adminOverrideStatus = adminState.userStatuses?.[existingUser.id];
        
        // Use admin override status if it exists, otherwise use effectiveStatus
        const finalStatus = adminOverrideStatus || effectiveStatus;
        
        // Use the effectiveStatus that was already resolved (prefers local when admin API unavailable)
        existingUsers[existingIndex] = { 
          ...existingUser, 
          ...userData,
          email: preservedEmail, // Preserve real email
          name: userData.name || existingUser.name, // Use new name if available, otherwise keep old
          phone: userData.phone || existingUser.phone, // Use new phone if available, otherwise keep old
          status: finalStatus, // Use admin override if exists, otherwise use resolved status
          business_id: userData.business_id || existingUser.business_id // Preserve business_id
        };
        
        if (adminOverrideStatus) {
          console.log(`[admin-import] Using admin override status for ${existingUser.id}: ${adminOverrideStatus} (ignoring backend status: ${backendStatus})`);
        }
        
        console.log(`[admin-import] Updated user ${existingUser.id} - Status: ${existingUsers[existingIndex].status} (effectiveStatus=${effectiveStatus}, backendStatus=${backendStatus}, localStatus=${localStatus || 'none'})`);
        updated++;
        console.log(`[admin-import] Updated user ${existingUser.id} - Email: ${preservedEmail}, Name: ${existingUsers[existingIndex].name}`);
      } else {
        // Add new user - but check if email is fake
        if (userData.email.includes('@chamber122.com')) {
          console.warn(`[admin-import] Warning: Using fake email for new user ${userData.id}: ${userData.email}`);
        } else {
          console.log(`[admin-import] Adding new user: ${userData.id} - ${userData.email}`);
        }
        existingUsers.push(userData);
        imported++;
      }
      
      return userData;
    });
    
    // Save all users
    saveUsers(existingUsers);
    
    // Also update admin dashboard state with resolved statuses
    // IMPORTANT: Preserve existing statuses from state if they exist (admin overrides)
    const updatedState = JSON.parse(localStorage.getItem(stateKey) || '{}');
    if (!updatedState.userStatuses) updatedState.userStatuses = {};
    
    // Only update statuses for users that don't already have a status in state
    // This preserves admin actions (suspend/approve) that were done before import
    usersToSave.forEach(userData => {
      if (userData.id) {
        // If user already has a status in state (from admin actions), preserve it
        // Only update if status doesn't exist in state
        if (!updatedState.userStatuses[userData.id]) {
          updatedState.userStatuses[userData.id] = userData.status || 'pending';
          console.log(`[admin-import] Set new status for ${userData.id}: ${userData.status}`);
        } else {
          // Status exists in state - preserve it (admin override)
          console.log(`[admin-import] Preserving existing status for ${userData.id}: ${updatedState.userStatuses[userData.id]} (not overwriting with ${userData.status})`);
        }
      }
    });
    localStorage.setItem(stateKey, JSON.stringify(updatedState));
    console.log('[admin-import] Updated admin dashboard state with resolved statuses (preserved existing admin overrides)');
    
    // Fetch and import documents for all businesses
    const businessIds = businesses.map(b => b.id).filter(Boolean);
    if (businessIds.length > 0) {
      console.log('[admin-import] Fetching documents for businesses...');
      const fetchedDocuments = await fetchDocumentsForBusinesses(businessIds);
      
      if (fetchedDocuments.length > 0) {
        // Get existing documents
        const { getAllDocuments, saveDocuments } = await import('./admin-auth.js');
        const existingDocs = getAllDocuments();
        
        // Merge documents (avoid duplicates)
        const docMap = new Map();
        existingDocs.forEach(doc => {
          const key = `${doc.user_id}_${doc.kind}`;
          docMap.set(key, doc);
        });
        
        fetchedDocuments.forEach(doc => {
          const key = `${doc.user_id}_${doc.kind}`;
          // Only add if not already exists or if new one has better URL
          if (!docMap.has(key) || (!docMap.get(key).file_url || docMap.get(key).file_url === '#')) {
            docMap.set(key, doc);
          }
        });
        
        // Save merged documents
        saveDocuments(Array.from(docMap.values()));
        console.log(`[admin-import] Imported ${fetchedDocuments.length} documents, total: ${docMap.size}`);
      }
    }
    
    console.log(`[admin-import] Imported ${imported} new users, updated ${updated} existing users`);
    
    return {
      imported,
      updated,
      total: existingUsers.length
    };
  } catch (error) {
    console.error('[admin-import] Error importing businesses:', error);
    throw error;
  }
}

/**
 * Auto-import businesses when admin dashboard loads
 */
export async function autoImportBusinesses() {
  try {
    const result = await importBusinessesFromAPI();
    console.log('[admin-import] Auto-import completed:', result);
    return result;
  } catch (error) {
    console.error('[admin-import] Auto-import failed:', error);
    return { imported: 0, updated: 0, total: 0 };
  }
}

