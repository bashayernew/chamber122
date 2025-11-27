/**
 * Signup Interceptor - Captures real user signups and saves to admin system
 * This hooks into the signup process to save user data to localStorage
 */

import { getAllUsers, generateId } from './auth-localstorage.js';

// Save users to localStorage
function saveUsers(users) {
  try {
    localStorage.setItem('chamber122_users', JSON.stringify(users));
  } catch (e) {
    console.error('[signup-to-admin] Error saving users:', e);
  }
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Save documents to localStorage
function saveDocuments(documents) {
  try {
    localStorage.setItem('chamber122_documents', JSON.stringify(documents));
  } catch (e) {
    console.error('[signup-to-admin] Error saving documents:', e);
  }
}

/**
 * Save user signup data to admin system
 */
export function saveSignupToAdmin(userData) {
  try {
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
export async function saveDocumentsToAdmin(userId, businessId, documents) {
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
    
    // Convert documents object to array - process async to convert files to base64
    const docEntries = Object.entries(documents || {});
    
    for (const [key, fileData] of docEntries) {
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
          // Prioritize base64 data URLs, then real URLs, then convert File objects to base64
          let fileUrl = fileData.base64 || fileData.url || fileData.signedUrl || fileData.path || fileData.publicUrl || fileData.public_url || '';
          
          // If we have a file object, convert it to base64 for storage
          const hasFile = fileData.file && fileData.file instanceof File;
          let base64Data = null;
          
          if (hasFile) {
            try {
              console.log(`[signup-to-admin] Converting file to base64 for ${adminDocType}...`);
              base64Data = await fileToBase64(fileData.file);
              fileUrl = base64Data; // Use base64 as the file URL
              console.log(`[signup-to-admin] ✅ Converted ${adminDocType} to base64 (${Math.round(base64Data.length / 1024)}KB)`);
            } catch (err) {
              console.error(`[signup-to-admin] Error converting file to base64 for ${adminDocType}:`, err);
              // Fall back to existing URL or placeholder
            }
          }
          
          // Skip blob URLs - they're temporary and won't work later
          if (fileUrl.startsWith('blob:')) {
            console.log(`[signup-to-admin] Blob URL for ${adminDocType}, trying to convert...`);
            // If we have a file, convert it to base64
            if (hasFile && !base64Data) {
              try {
                base64Data = await fileToBase64(fileData.file);
                fileUrl = base64Data;
                console.log(`[signup-to-admin] ✅ Converted blob URL to base64 for ${adminDocType}`);
              } catch (err) {
                console.error(`[signup-to-admin] Error converting blob to base64:`, err);
                fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
              }
            } else {
              // Try to get from other sources
              fileUrl = fileData.path || fileData.publicUrl || fileData.public_url || '';
              if (!fileUrl || fileUrl.startsWith('blob:')) {
                // If we have file name but no valid URL, use placeholder
                if (fileName) {
                  fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
                  console.log(`[signup-to-admin] Using placeholder URL for ${adminDocType} (has file name: ${fileName})`);
                } else {
                  console.warn(`[signup-to-admin] No real URL, file, or file name for ${adminDocType}, skipping`);
                  continue; // Skip this document
                }
              }
            }
          }
          
          // If still no valid URL but we have a file, try to convert it
          if ((!fileUrl || fileUrl === '#') && hasFile && !base64Data) {
            try {
              base64Data = await fileToBase64(fileData.file);
              fileUrl = base64Data;
              console.log(`[signup-to-admin] ✅ Converted file to base64 for ${adminDocType}`);
            } catch (err) {
              console.error(`[signup-to-admin] Error converting file:`, err);
              fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
            }
          }
          
          // If still no valid URL but we have file name, use placeholder
          if ((!fileUrl || fileUrl === '#') && fileName && !hasFile) {
            fileUrl = `pending_upload_${adminDocType}_${Date.now()}`;
            console.log(`[signup-to-admin] Using placeholder URL for ${adminDocType} (has file name only)`);
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
            base64: base64Data || (fileUrl && fileUrl.startsWith('data:') ? fileUrl : null), // Store base64 separately
            url: fileUrl.startsWith('data:') ? fileUrl : null, // Also store in url field if it's base64
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
    }
    
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

