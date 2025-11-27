/**
 * Signup Interceptor - Captures real user signups and saves to admin system
 * This hooks into the signup process to save user data to localStorage
 */

import { saveUsers, saveDocuments, getAllUsers } from './admin-auth.js';

/**
 * Save user signup data to admin system
 */
export async function saveSignupToAdmin(userData) {
  try {
    const { getAllUsers, saveUsers } = await import('./auth-localstorage.js');
    const users = getAllUsers();
    
    console.log('[signup-to-admin] Saving user:', userData.email, 'Current users count:', users.length);
    
    // Check if user already exists
    const existingIndex = users.findIndex(u => u.email === userData.email || u.id === userData.id);
    
    const userRecord = {
      id: userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email,
      name: userData.name || userData.full_name || userData.business_name || '',
      phone: userData.phone || '',
      business_name: userData.business_name || userData.display_name || userData.legal_name || userData.name || '',
      industry: userData.industry || userData.category || '',
      city: userData.city || '',
      country: userData.country || 'Kuwait',
      role: userData.role || 'msme',
      status: 'pending', // All new signups start as pending
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      // Update existing user
      users[existingIndex] = { ...users[existingIndex], ...userRecord, updated_at: new Date().toISOString() };
      console.log('[signup-to-admin] Updated existing user:', userRecord.email);
    } else {
      // Add new user
      users.push(userRecord);
      console.log('[signup-to-admin] Added new user:', userRecord.email);
    }
    
    saveUsers(users);
    console.log('[signup-to-admin] ✅ User saved to admin system. Total users:', users.length);
    
    // Dispatch custom event to notify admin dashboard (same tab)
    window.dispatchEvent(new CustomEvent('userSignup', { detail: userRecord }));
    
    return userRecord;
  } catch (error) {
    console.error('[signup-to-admin] Error saving user:', error);
    return null;
  }
}

/**
 * Save documents to admin system
 */
export function saveDocumentsToAdmin(userId, businessId, documents) {
  try {
    const allDocs = [];
    
    // Map signup document types to admin document types
    // Keep all document types separate for better tracking
    const docMapping = {
      'civil_id_front': 'civil_id_front',
      'civil_id_back': 'civil_id_back',
      'owner_proof': 'owner_proof',
      'license': 'license', // Keep license separate
      'articles': 'articles', // Keep articles separate (Articles of Incorporation)
      'iban': 'iban', // Keep IBAN separate
      'signature_auth': 'signature_auth' // Keep signature authorization separate
    };
    
    // Convert documents object to array
    Object.entries(documents || {}).forEach(([key, fileData]) => {
      if (fileData) {
        // Map the key to admin document type
        const adminDocType = docMapping[key] || key;
        
        // Save all recognized document types
        const recognizedTypes = ['civil_id_front', 'civil_id_back', 'owner_proof', 'license', 'iban', 'articles', 'signature_auth'];
        if (recognizedTypes.includes(adminDocType)) {
          // Extract file name from various possible sources
          let fileName = fileData.name || fileData.fileName || fileData.file?.name;
          
          // If fileData has a file object, get name from it
          if (!fileName && fileData.file && fileData.file instanceof File) {
            fileName = fileData.file.name;
          }
          
          // Fallback to document type name
          if (!fileName) {
            fileName = `${adminDocType}.pdf`;
          }
          
          // Extract file URL from various possible sources
          // Prioritize real URLs over blob URLs
          let fileUrl = fileData.url || fileData.signedUrl || fileData.path || fileData.publicUrl || fileData.public_url || '#';
          
          // If we have a file object but no URL, we'll save it with a placeholder
          // The admin dashboard can show it as "uploaded but URL pending"
          const hasFile = fileData.file && fileData.file instanceof File;
          
          // IMPORTANT: Save documents even if they only have file objects (no URL yet)
          // This ensures they appear in admin dashboard immediately during signup
          // The URL will be updated later when the file is actually uploaded to backend
          
          // Skip blob URLs - they're temporary and won't work later
          if (fileUrl.startsWith('blob:')) {
            console.log(`[signup-to-admin] Blob URL for ${adminDocType}, will use placeholder`);
            // If we have a file, save it with placeholder URL - admin can see it was uploaded
            if (hasFile) {
              fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
              console.log(`[signup-to-admin] ✅ Using placeholder URL for ${adminDocType} (file exists, URL will be updated later)`);
            } else {
              // Try to get from other sources
              fileUrl = fileData.path || fileData.publicUrl || fileData.public_url || '#';
              if (fileUrl.startsWith('blob:')) {
                // Still save with placeholder if we have file name at least
                if (fileName) {
                  fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
                  console.log(`[signup-to-admin] ✅ Using placeholder URL for ${adminDocType} (has file name: ${fileName})`);
                } else {
                  console.warn(`[signup-to-admin] No real URL, file, or file name for ${adminDocType}, skipping`);
                  return; // Skip this document if no real URL, no file, and no file name
                }
              }
            }
          }
          
          // If still no valid URL but we have a file or file name, use placeholder
          if ((!fileUrl || fileUrl === '#') && (hasFile || fileName)) {
            fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
            console.log(`[signup-to-admin] ✅ Using placeholder URL for ${adminDocType} (has file or file name)`);
          }
          
          // Extract file size
          const fileSize = fileData.size || fileData.file?.size || 0;
          
          console.log(`[signup-to-admin] Saving document: ${adminDocType}`, {
            key,
            fileName,
            fileUrl: fileUrl.substring(0, 100),
            fileSize,
            hasRealUrl: !fileUrl.startsWith('blob:') && fileUrl !== '#'
          });
          
          // CRITICAL: Save documents even if they only have file objects (no URL yet)
          // This ensures they appear in admin dashboard immediately during signup
          // The URL will be updated later when the file is actually uploaded to backend
          
          // Only skip if we have NO file, NO file name, and NO valid URL
          // If we have any of these, save it so admin can see it was uploaded
          if (!hasFile && !fileName && (!fileUrl || fileUrl === '#' || (fileUrl.startsWith('blob:') && !fileUrl.startsWith('pending_')))) {
            console.warn(`[signup-to-admin] Skipping ${adminDocType} - no file, no file name, and no valid URL`);
            return;
          }
          
          // If we have a file but no URL yet, ensure we use placeholder
          // This is important - we want to show the document in admin dashboard even if URL isn't ready
          if (hasFile && (!fileUrl || fileUrl === '#' || fileUrl.startsWith('blob:'))) {
            fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
            console.log(`[signup-to-admin] ✅ Created placeholder URL for ${adminDocType} (file exists, will be updated when uploaded)`);
          }
          
          // Also create placeholder if we have file name but no file and no URL
          if (fileName && !hasFile && (!fileUrl || fileUrl === '#' || fileUrl.startsWith('blob:'))) {
            fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
            console.log(`[signup-to-admin] ✅ Created placeholder URL for ${adminDocType} (has file name: ${fileName})`);
          }
          
          allDocs.push({
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            business_id: businessId || userId,
            kind: adminDocType,
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize,
            uploaded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            // Mark if URL is pending (will be updated later)
            url_pending: fileUrl.startsWith('pending_') || fileUrl.startsWith('blob:')
          });
          
          console.log(`[signup-to-admin] ✅ Saved document ${adminDocType} for user ${userId}:`, {
            fileName,
            hasUrl: !fileUrl.startsWith('pending_') && !fileUrl.startsWith('blob:') && fileUrl !== '#',
            urlPending: fileUrl.startsWith('pending_')
          });
        }
      }
    });
    
    if (allDocs.length > 0) {
      const existingDocs = JSON.parse(localStorage.getItem('chamber122_documents') || '[]');
      existingDocs.push(...allDocs);
      saveDocuments(existingDocs);
      console.log('[signup-to-admin] Documents saved:', allDocs.length);
      
      // Dispatch custom event to notify admin dashboard (same tab)
      window.dispatchEvent(new CustomEvent('documentsUpdated', { detail: allDocs }));
    }
    
    return allDocs;
  } catch (error) {
    console.error('[signup-to-admin] Error saving documents:', error);
    return [];
  }
}

/**
 * Hook into signup process - call this after successful signup
 */
export function interceptSignup(userData, documents = {}) {
  const userRecord = saveSignupToAdmin(userData);
  if (userRecord && documents) {
    saveDocumentsToAdmin(userRecord.id, userRecord.id, documents);
  }
  return userRecord;
}

