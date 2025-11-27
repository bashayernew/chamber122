// public/js/owner-form.js - Edit business profile using backend API with FormData
import { getMyBusiness, getCurrentUser } from '/js/api.js';

console.log('[owner-form] Loading - Using FormData for saves');

/**
 * Mark account as updated after fixing documents
 * This updates the admin dashboard state to show the account has been updated
 */
async function markAccountUpdatedAfterIssue(currentUserId) {
  if (!currentUserId) {
    console.warn('[owner-form] No userId provided to markAccountUpdatedAfterIssue');
    return;
  }

  try {
    // Load admin dashboard state
    const stateKey = 'chamber_admin_dashboard_state';
    const stateStr = localStorage.getItem(stateKey);
    if (!stateStr) {
      console.debug('[owner-form] No admin dashboard state found - creating new state');
      const newState = {
        userMetadata: {},
        userStatuses: {}
      };
      newState.userMetadata[currentUserId] = {
        documentsUpdatedAt: Date.now()
      };
      newState.userStatuses[currentUserId] = 'updated';
      localStorage.setItem(stateKey, JSON.stringify(newState));
      console.log('[owner-form] Created new admin state and marked account as updated');
      return;
    }

    const state = JSON.parse(stateStr);

    // Make sure we have a metadata object
    if (!state.userMetadata) state.userMetadata = {};
    if (!state.userMetadata[currentUserId]) state.userMetadata[currentUserId] = {};
    if (!state.userStatuses) state.userStatuses = {};

    // Mark as updated + record timestamp
    state.userMetadata[currentUserId].documentsUpdatedAt = Date.now();
    state.userStatuses[currentUserId] = 'updated';

    localStorage.setItem(stateKey, JSON.stringify(state));
    console.log('[owner-form] Account marked as updated in admin dashboard:', currentUserId);
    
    // Also update the user status in the main users storage if it exists
    try {
      const { getAllUsers, saveUsers } = await import('/js/admin-auth.js');
      const users = getAllUsers();
      const userIndex = users.findIndex(u => u.id === currentUserId);
      if (userIndex !== -1) {
        users[userIndex].status = 'updated';
        users[userIndex].updated_at = new Date().toISOString();
        saveUsers(users);
        console.log('[owner-form] User status updated in main users storage');
      }
    } catch (err) {
      console.debug('[owner-form] Could not update user status in main storage (may not exist):', err.message);
    }
  } catch (error) {
    console.error('[owner-form] Error marking account as updated:', error);
  }
}

const $ = s => document.getElementById(s);

// Safe trim helper - handles all value types
const safeTrim = (v) => {
  if (v == null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (Array.isArray(v)) return '';
  if (typeof v === 'object') {
    // Handle objects - try to extract a meaningful string value
    return (v.name || v.value || v.label || '').toString().trim();
  }
  return String(v ?? '').trim();
};

let currentBusinessId = null;
let existingMedia = [];      // [{id, public_url}]
let removedMediaIds = new Set();
let newFiles = [];           // File[]

// ---- Logo Preview
function setupLogoPreview() {
  const logoInput = document.getElementById('logo');
  const logoPreview = document.getElementById('logoPreview');
  
  if (!logoInput || !logoPreview) return;
  
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Revoke previous object URL if exists
    if (logoPreview.dataset.objectUrl) {
      URL.revokeObjectURL(logoPreview.dataset.objectUrl);
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    logoPreview.src = objectUrl;
    logoPreview.dataset.objectUrl = objectUrl;
    logoPreview.style.display = 'block';
    logoPreview.style.visibility = 'visible';
    logoPreview.style.opacity = '1';
  });
}

// Setup Gallery Preview
function setupGalleryPreview() {
  const galleryInput = document.getElementById('galleryFiles');
  const galleryPreview = document.getElementById('galleryPreview');
  
  if (!galleryInput || !galleryPreview) return;
  
  galleryInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const MAX_GALLERY = 5;
    const currentTotal = existingMedia.length - removedMediaIds.size + newFiles.length;
    const remainingSlots = Math.max(0, MAX_GALLERY - currentTotal);
    
    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more image(s). Maximum ${MAX_GALLERY} images allowed.`);
      const filesToAdd = files.slice(0, remainingSlots);
      newFiles.push(...filesToAdd);
    } else {
      newFiles.push(...files);
    }
    
    renderGallery();
    e.target.value = ''; // Reset input
  });
}

// Render Gallery
function renderGallery() {
  const wrap = document.getElementById('galleryPreview');
  if (!wrap) return;
  
  wrap.classList.add('gallery-grid');
  wrap.innerHTML = '';
  wrap.style.display = 'grid';

  // Show message if no images
  if (existingMedia.length === 0 && newFiles.length === 0) {
    const noImagesMsg = document.createElement('div');
    noImagesMsg.textContent = 'No images yet. Select files below to add them.';
    noImagesMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;';
    wrap.appendChild(noImagesMsg);
    return;
  }

  // Existing images (with remove button)
  for (const m of existingMedia) {
    if (removedMediaIds.has(m.id)) continue;

    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = m.url;
    img.alt = 'Gallery image';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.type = 'button';
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      removedMediaIds.add(m.id);
      renderGallery();
    };
    item.appendChild(btn);

    wrap.appendChild(item);
  }

  // New files preview
  for (const f of newFiles) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(f);
    img.src = objectUrl;
    img.alt = f.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    item.dataset.objectUrl = objectUrl;
    item.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'gallery-remove';
    btn.textContent = '×';
    btn.type = 'button';
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (item.dataset.objectUrl) {
        URL.revokeObjectURL(item.dataset.objectUrl);
      }
      newFiles = newFiles.filter(x => x !== f);
      renderGallery();
    };
    item.appendChild(btn);

    wrap.appendChild(item);
  }
}

// Load existing gallery
async function loadExistingGallery(businessId) {
  try {
    // Get business from localStorage
    const { getBusinessByOwner, getCurrentUser } = await import('/js/auth-localstorage.js');
    const user = getCurrentUser();
    if (!user) return;
    
    const business = getBusinessByOwner(user.id);
    if (!business) return;
    
    // Get gallery URLs from business
    const galleryUrls = business.gallery_urls || [];
    
    existingMedia = galleryUrls
      .map((url, idx) => ({
        id: idx.toString(),
        url: url
      }))
      .filter(r => {
        // Filter out blob URLs - they're temporary and can't be used
        if (!r.url) return false;
        if (r.url.startsWith('blob:')) {
          console.warn('[owner-form] Skipping blob URL in existing media:', r.url);
          return false;
        }
        return true;
      });
    
    renderGallery();
  } catch (error) {
    console.error('loadExistingGallery error', error);
  }
}

// Preload edit data
async function preloadEdit() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/auth.html#login';
    return;
  }

  // Fetch business data from localStorage
  const businessResponse = await getMyBusiness();
  let business = businessResponse && businessResponse.business ? businessResponse.business : null;
  
  // Get media from response
  if (businessResponse && businessResponse.media) {
    business = business || {};
    business.media = businessResponse.media;
  }
  
  console.log('[owner-form] Raw business data from localStorage:', business);
  console.log('[owner-form] Business media:', business && business.media ? business.media.length : 0, 'items');
  
  if (!business) {
    // CREATE mode - check if we have signup data to pre-populate
    const signupDataStr = localStorage.getItem('chamber122_signup_data');
    if (signupDataStr) {
      try {
        const signupData = JSON.parse(signupDataStr);
        console.log('[owner-form] Found signup data, pre-populating form:', signupData);
        
        // Pre-populate form fields from signup data
        if (signupData.name) {
          const nameField = document.getElementById('name');
          if (nameField) nameField.value = signupData.name;
        }
        if (signupData.phone) {
          const phoneField = document.getElementById('phone');
          if (phoneField) phoneField.value = signupData.phone;
        }
        if (signupData.whatsapp) {
          const whatsappField = document.getElementById('whatsapp');
          if (whatsappField) whatsappField.value = signupData.whatsapp;
        }
        if (signupData.website) {
          const websiteField = document.getElementById('website');
          if (websiteField) websiteField.value = signupData.website;
        }
        if (signupData.instagram) {
          const instagramField = document.getElementById('instagram');
          if (instagramField) instagramField.value = signupData.instagram;
        }
        if (signupData.country) {
          const countryField = document.getElementById('country');
          if (countryField) countryField.value = signupData.country;
        }
        if (signupData.city) {
          const cityField = document.getElementById('city');
          if (cityField) cityField.value = signupData.city;
        }
        if (signupData.description) {
          const descField = document.getElementById('description');
          if (descField) descField.value = signupData.description;
        }
        if (signupData.story) {
          const storyField = document.getElementById('story');
          if (storyField) storyField.value = signupData.story;
        }
        if (signupData.industry || signupData.category) {
          const industryField = document.getElementById('industry') || document.getElementById('category');
          if (industryField) industryField.value = signupData.industry || signupData.category;
        }
        
        // Handle logo from signup data
        if (signupData.logo) {
          console.log('[owner-form] Signup data includes logo:', signupData.logo);
          // Show a message that logo was uploaded during signup
          const logoInput = document.getElementById('logo');
          if (logoInput) {
            const logoStatus = document.createElement('div');
            logoStatus.style.cssText = 'margin-top: 8px; padding: 8px; background: #10b98120; border: 1px solid #10b981; border-radius: 4px; color: #10b981; font-size: 14px;';
            logoStatus.textContent = `✓ Logo uploaded during signup: ${signupData.logo.name || 'logo file'}`;
            logoInput.parentNode?.appendChild(logoStatus);
          }
        }
        
        // Handle gallery from signup data
        if (signupData.gallery && signupData.gallery.length > 0) {
          console.log('[owner-form] Signup data includes gallery:', signupData.gallery.length, 'images');
          const galleryStatus = document.createElement('div');
          galleryStatus.style.cssText = 'margin-top: 8px; padding: 8px; background: #10b98120; border: 1px solid #10b981; border-radius: 4px; color: #10b981; font-size: 14px;';
          galleryStatus.textContent = `✓ ${signupData.gallery.length} gallery image(s) uploaded during signup`;
          const galleryInput = document.getElementById('gallery');
          if (galleryInput) {
            galleryInput.parentNode?.appendChild(galleryStatus);
          }
        }
        
        // Handle documents from signup data
        if (signupData.documents) {
          console.log('[owner-form] Signup data includes documents:', Object.keys(signupData.documents).length);
          const docTypes = {
            'license': 'License',
            'iban': 'IBAN Certificate',
            'articles': 'Articles of Incorporation',
            'signature_auth': 'Signature Authorization',
            'civil_id_front': 'Civil ID Front',
            'civil_id_back': 'Civil ID Back',
            'owner_proof': 'Owner Proof'
          };
          
          for (const [docType, docLabel] of Object.entries(docTypes)) {
            if (signupData.documents[docType]) {
              const doc = signupData.documents[docType];
              const docInput = document.getElementById(`${docType}-file`) || document.getElementById(`${docType.replace('_', '-')}-file`);
              if (docInput) {
                const docStatus = document.createElement('div');
                docStatus.style.cssText = 'margin-top: 8px; padding: 8px; background: #10b98120; border: 1px solid #10b981; border-radius: 4px; color: #10b981; font-size: 14px;';
                docStatus.textContent = `✓ ${docLabel} uploaded during signup: ${doc.name || 'file'}`;
                docInput.parentNode?.appendChild(docStatus);
              }
            }
          }
        }
        
        // Clear signup data after using it (one-time use)
        localStorage.removeItem('chamber122_signup_data');
        console.log('[owner-form] ✅ Form pre-populated from signup data (including logo, gallery, and documents)');
      } catch (err) {
        console.error('[owner-form] Error parsing signup data:', err);
        localStorage.removeItem('chamber122_signup_data');
      }
    }
    
    // Setup handlers
    setupLogoPreview();
    setupGalleryPreview();
    setupSaveHandler();
    return;
  }

  // EDIT mode
  currentBusinessId = business.id;
  
  console.log('[owner-form] Editing business ID:', currentBusinessId);

  // Fill form fields - handle both 'name' and 'business_name' fields
  const fieldMap = {
    name: 'name',
    phone: 'phone', 
    whatsapp: 'whatsapp',
    website: 'website',
    instagram: 'instagram',
    country: 'country',
    city: 'city',
    area: 'area',
    block: 'block',
    street: 'street',
    floor: 'floor',
    office_no: 'office_no',
    industry: 'industry',
    description: 'description',
    story: 'story'
  };

  Object.entries(fieldMap).forEach(([col, id]) => {
    const el = document.getElementById(id);
    if (el) {
      // For name field, check both 'name' and 'business_name'
      if (col === 'name') {
        const value = business.name || business.business_name || '';
        el.value = value; // Always set, even if empty
      } else if (col === 'industry') {
        // Special handling for industry SELECT dropdown
        let value = business.industry || business.category || '';
        
        // Handle objects (like industry might be an object)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          value = value.name || value.value || value.label || '';
        }
        
        value = safeTrim(String(value || ''));
        
        // For SELECT elements, check if the value exists as an option
        if (el.tagName === 'SELECT') {
          // Try to find matching option by value
          const option = Array.from(el.options).find(opt => 
            opt.value === value || opt.text === value
          );
          
          if (option) {
            el.value = option.value;
          } else if (value) {
            // If value doesn't match, try to find partial match
            const partialMatch = Array.from(el.options).find(opt => 
              opt.value.toLowerCase().includes(value.toLowerCase()) ||
              opt.text.toLowerCase().includes(value.toLowerCase())
            );
            if (partialMatch) {
              el.value = partialMatch.value;
            } else {
              console.warn('[owner-form] Industry value not found in options:', value);
              // Keep default/empty selection
            }
          }
        } else {
          // For input fields, just set the value
          el.value = value;
        }
      } else {
        // Get the value from business object
        let value = business[col];
        
        // Handle objects (like industry might be an object)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          value = value.name || value.value || value.label || '';
        }
        
        // Convert to string and handle null/undefined - use safeTrim
        if (value != null && value !== '') {
          const trimmedValue = safeTrim(value);
          // Don't save placeholder text as actual value
          if (trimmedValue && !trimmedValue.includes('Describe what you offer') && !trimmedValue.includes('Share your journey')) {
            el.value = trimmedValue;
          } else {
            el.value = '';
          }
        } else {
          // Set empty string if field is null/undefined to clear the field
          el.value = '';
        }
      }
    }
  });
  
  // Log populated fields for debugging
  const logData = {
    name: business.name || business.business_name || '(empty)',
    phone: business.phone || '(empty)',
    whatsapp: business.whatsapp || '(empty)',
    website: business.website || '(empty)',
    instagram: business.instagram || '(empty)',
    country: business.country || '(empty)',
    city: business.city || '(empty)',
    area: business.area || '(empty)',
    block: business.block || '(empty)',
    street: business.street || '(empty)',
    floor: business.floor || '(empty)',
    office_no: business.office_no || '(empty)',
    industry: (typeof business.industry === 'object' && business.industry !== null) 
      ? (business.industry.name || business.industry.value || JSON.stringify(business.industry))
      : (business.industry || business.category || '(empty)'),
    description: business.description ? 'Yes (' + business.description.length + ' chars)' : 'No',
    story: business.story ? 'Yes (' + business.story.length + ' chars)' : 'No'
  };
  console.log('[owner-form] Form fields populated:', logData);
  
  // Also log what was actually set in form fields
  setTimeout(() => {
    const actualValues = {};
    Object.values(fieldMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        actualValues[id] = el.value || '(empty)';
      }
    });
    console.log('[owner-form] Actual form field values:', actualValues);
  }, 100);

  // Logo preview - filter out blob URLs
  const logoPreview = document.getElementById('logoPreview');
  if (logoPreview && business.logo_url) {
    // Don't use blob URLs - they're temporary and can't be loaded
    if (business.logo_url.startsWith('blob:')) {
      console.warn('[owner-form] Skipping blob URL for logo:', business.logo_url);
    } else {
      // Ensure logo preview container is visible
      const logoPreviewContainer = logoPreview.closest('.logo-preview-container') || 
                                   logoPreview.parentElement;
      if (logoPreviewContainer) {
        logoPreviewContainer.style.display = 'block';
      }
      logoPreview.src = business.logo_url;
      logoPreview.style.display = 'block';
      logoPreview.style.visibility = 'visible';
      logoPreview.style.opacity = '1';
      console.log('[owner-form] Logo preview set:', business.logo_url);
    }
  } else if (logoPreview) {
    console.log('[owner-form] No logo URL found for business');
  }

  // Load existing gallery
  await loadExistingGallery(currentBusinessId);
  
  // Ensure gallery preview container is visible if there are images
  const galleryPreview = document.getElementById('galleryPreview');
  if (galleryPreview && (existingMedia.length > 0 || newFiles.length > 0)) {
    const galleryContainer = galleryPreview.closest('.gallery-preview-container') || 
                             galleryPreview.parentElement;
    if (galleryContainer) {
      galleryContainer.style.display = 'block';
    }
    galleryPreview.style.display = 'grid';
    console.log('[owner-form] Gallery preview container made visible');
  }

  // Load and display existing documents
  await loadExistingDocuments(business);

  // Setup handlers
  setupLogoPreview();
  setupGalleryPreview();
  setupSaveHandler();
}

// Load and display existing documents
async function loadExistingDocuments(business) {
  try {
    // Get media from business object or from localStorage documents
    let media = business.media || [];
    
    // If no media in business object, get from localStorage documents
    if (!media || media.length === 0) {
      try {
        const { getCurrentUser } = await import('/js/auth-localstorage.js');
        const user = getCurrentUser();
        if (user && user.id && business && business.id) {
          // Try to get documents from localStorage
          const documentsStr = localStorage.getItem('chamber122_documents');
          if (documentsStr) {
            try {
              const allDocuments = JSON.parse(documentsStr);
              // Filter documents for this user/business
              const userDocuments = allDocuments.filter(doc => 
                (doc.user_id === user.id || doc.owner_id === user.id || doc.business_id === business.id)
              );
              
              // Convert documents to media format
              media = userDocuments.map(doc => ({
                id: doc.id || doc.document_id,
                business_id: business.id,
                document_type: doc.document_type || doc.type || doc.kind,
                public_url: doc.url || doc.signedUrl || doc.path || doc.public_url,
                file_name: doc.name || doc.file_name,
                file_type: doc.file_type || 'document',
                created_at: doc.created_at || doc.uploaded_at
              }));
              console.log('[owner-form] Loaded documents from localStorage:', media.length, 'items');
            } catch (parseErr) {
              console.warn('[owner-form] Error parsing documents from localStorage:', parseErr);
              media = [];
            }
          } else {
            // Also check if documents are stored in business.documents object
            if (business.documents && typeof business.documents === 'object') {
              media = Object.entries(business.documents).map(([docType, docData]) => {
                const url = typeof docData === 'string' ? docData : (docData.url || docData.signedUrl || docData.path);
                return {
                  id: docType,
                  business_id: business.id,
                  document_type: docType,
                  public_url: url,
                  file_name: docType + '.png',
                  file_type: 'document',
                  created_at: business.updated_at || business.created_at
                };
              });
              console.log('[owner-form] Loaded documents from business.documents:', media.length, 'items');
            }
          }
        }
      } catch (err) {
        console.warn('[owner-form] Could not load documents from localStorage:', err);
        media = [];
      }
    }
    
    // Map document types to their input IDs and status elements
    const docMapping = {
      'license': { inputId: 'license-file', statusId: 'license-status' },
      'iban': { inputId: 'iban-file', statusId: 'iban-status' },
      'articles': { inputId: 'articles-file', statusId: 'articles-status' },
      'signature_auth': { inputId: 'signature-file', statusId: 'signature-status' },
      'civil_id_front': { inputId: 'civil-id-front-file', statusId: 'civil-id-front-status' },
      'civil_id_back': { inputId: 'civil-id-back-file', statusId: 'civil-id-back-status' },
      'owner_proof': { inputId: 'owner-proof-file', statusId: 'owner-proof-status' }
    };

    // Filter documents (exclude gallery and logo)
    const documents = media.filter(m => {
      const docType = (m.document_type || m.type || m.kind || '').toLowerCase();
      return docType && docType !== 'gallery' && docType !== 'logo' && docMapping[docType];
    });

    console.log('[owner-form] Found existing documents:', documents.length);
    console.log('[owner-form] Document types:', documents.map(d => d.document_type || d.type || d.kind));

    // Display each document
    documents.forEach(doc => {
      const docType = (doc.document_type || doc.type || doc.kind || '').toLowerCase();
      const mapping = docMapping[docType];
      
      if (mapping) {
        const statusEl = document.getElementById(mapping.statusId);
        const fileUrl = doc.public_url || doc.url || doc.publicUrl || doc.path;
        const fileName = doc.file_name || doc.name || `${docType}.pdf`;
        
        if (statusEl && fileUrl && !fileUrl.startsWith('blob:')) {
          // Show document status with link to view
          // For base64 data URLs, use directly; for other URLs, use as-is
          const fullUrl = fileUrl.startsWith('data:') || fileUrl.startsWith('http') ? fileUrl : fileUrl;
          
          // If it's a base64 image, show a preview
          if (fileUrl.startsWith('data:image')) {
            statusEl.innerHTML = `
              <span style="color: #10b981;">✓ Uploaded: </span>
              <a href="${fullUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                ${fileName}
              </a>
              <span style="color: #9ca3af; font-size: 12px;"> (Click to view)</span>
              <br>
              <img src="${fullUrl}" alt="${fileName}" style="max-width: 200px; max-height: 150px; margin-top: 8px; border-radius: 4px; border: 1px solid #3a3a3a;">
              <br>
              <span style="color: #9ca3af; font-size: 11px;">You can upload a new file to replace this document.</span>
            `;
          } else {
            statusEl.innerHTML = `
              <span style="color: #10b981;">✓ Uploaded: </span>
              <a href="${fullUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                ${fileName}
              </a>
              <span style="color: #9ca3af; font-size: 12px;"> (Click to view)</span>
              <br>
              <span style="color: #9ca3af; font-size: 11px;">You can upload a new file to replace this document.</span>
            `;
          }
          statusEl.style.display = 'block';
          console.log(`[owner-form] Displayed document: ${docType} - ${fileName}`);
        }
      }
    });

    // Show "No file uploaded" for documents that don't exist
    Object.entries(docMapping).forEach(([docType, mapping]) => {
      const hasDoc = documents.some(d => {
        const dType = (d.document_type || d.type || d.kind || '').toLowerCase();
        return dType === docType;
      });
      
      if (!hasDoc) {
        const statusEl = document.getElementById(mapping.statusId);
        if (statusEl && !statusEl.innerHTML.trim()) {
          statusEl.innerHTML = '<span style="color: #9ca3af;">No file uploaded</span>';
          statusEl.style.display = 'block';
        }
      }
    });

  } catch (error) {
    console.error('[owner-form] Error loading existing documents:', error);
  }
}

// Setup save handler
let saveHandlerSetup = false;

function setupSaveHandler() {
  if (saveHandlerSetup) return;
  
  const saveBtn = document.getElementById('saveBtn');
  const form = document.getElementById('biz-form');
  
  if (!saveBtn || !form) return;
  
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveProfile(e);
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProfile(e);
  });
  
  saveHandlerSetup = true;
}

// Save profile using FormData
async function saveProfile(ev) {
  ev.preventDefault();
  
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn?.textContent;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    const form = document.getElementById('biz-form');
    const fd = new FormData(form);
    
    // Add text fields - use safeTrim for all values
    // Note: $ is getElementById, not jQuery, so use $('name') not $('#name')
    const nameEl = $('name');
    const nameValue = nameEl ? safeTrim(nameEl.value) : '';
    fd.append('business_name', nameValue);
    fd.append('name', nameValue);
    
    const phoneEl = $('phone');
    fd.append('phone', phoneEl ? safeTrim(phoneEl.value) : '');
    
    const whatsappEl = $('whatsapp');
    fd.append('whatsapp', whatsappEl ? safeTrim(whatsappEl.value) : '');
    
    const websiteEl = $('website');
    fd.append('website', websiteEl ? safeTrim(websiteEl.value) : '');
    
    const instagramEl = $('instagram');
    fd.append('instagram', instagramEl ? safeTrim(instagramEl.value) : '');
    
    const countryEl = $('country');
    fd.append('country', countryEl ? (safeTrim(countryEl.value) || 'Kuwait') : 'Kuwait');
    
    const cityEl = $('city');
    fd.append('city', cityEl ? safeTrim(cityEl.value) : '');
    
    const areaEl = $('area');
    fd.append('area', areaEl ? safeTrim(areaEl.value) : '');
    
    const blockEl = $('block');
    fd.append('block', blockEl ? safeTrim(blockEl.value) : '');
    
    const streetEl = $('street');
    fd.append('street', streetEl ? safeTrim(streetEl.value) : '');
    
    const floorEl = $('floor');
    fd.append('floor', floorEl ? safeTrim(floorEl.value) : '');
    
    const officeNoEl = $('office_no');
    fd.append('office_no', officeNoEl ? safeTrim(officeNoEl.value) : '');
    
    // Handle industry dropdown - ensure it's a string value, not an object
    const industryEl = $('industry');
    let industryValue = '';
    if (industryEl) {
      if (industryEl.tagName === 'SELECT') {
        // For select dropdowns, get the selected option's value
        industryValue = safeTrim(industryEl.value);
      } else {
        // For input fields
        industryValue = safeTrim(industryEl.value);
      }
    }
    fd.append('industry', industryValue);
    fd.append('category', industryValue);
    
    const descriptionEl = document.getElementById('description');
    if (descriptionEl && descriptionEl.tagName === 'TEXTAREA') {
      const descriptionValue = safeTrim(descriptionEl.value || '');
      // Don't save placeholder text or label text
      const invalidTexts = ['Describe what you offer', 'Business Description', 'Tell us about your business'];
      const isInvalid = invalidTexts.some(text => descriptionValue.includes(text));
      const finalDescription = (descriptionValue && !isInvalid) ? descriptionValue : '';
      fd.append('description', finalDescription);
      console.log('[owner-form] Description value:', finalDescription.substring(0, 50) + (finalDescription.length > 50 ? '...' : ''));
    } else {
      fd.append('description', '');
    }
    
    const storyEl = document.getElementById('story');
    if (storyEl && storyEl.tagName === 'TEXTAREA') {
      const storyValue = safeTrim(storyEl.value || '');
      // Don't save placeholder text or label text
      const invalidTexts = ['Share your journey', 'Business Description', 'Tell us about your business'];
      const isInvalid = invalidTexts.some(text => storyValue.includes(text));
      const finalStory = (storyValue && !isInvalid) ? storyValue : '';
      fd.append('story', finalStory);
      console.log('[owner-form] Story value:', finalStory.substring(0, 50) + (finalStory.length > 50 ? '...' : ''));
    } else {
      fd.append('story', '');
    }
    
    console.log('[owner-form] Form values being sent:', {
      name: nameValue,
      phone: phoneEl?.value,
      industry: industryValue,
      description: descriptionEl?.value?.substring(0, 50)
    });
    
    // Add logo file if selected (check both input and preview data)
    const logoInput = document.getElementById('logo');
    let logoFile = null;
    
    if (logoInput?.files?.[0]) {
      logoFile = logoInput.files[0];
    } else {
      // Check if logo was selected but file input was reset (check preview)
      const logoPreview = document.getElementById('logoPreview');
      if (logoPreview?.dataset?.objectUrl) {
        // Try to get file from the blob URL
        try {
          const response = await fetch(logoPreview.dataset.objectUrl);
          const blob = await response.blob();
          const fileName = logoPreview.alt || 'logo.png';
          logoFile = new File([blob], fileName, { type: blob.type });
        } catch (err) {
          console.warn('[owner-form] Could not get logo file from preview:', err);
        }
      }
    }
    
    if (logoFile) {
      console.log('[owner-form] Adding logo file to FormData:', logoFile.name, logoFile.size, 'bytes');
      fd.append('logo', logoFile);
    } else {
      console.log('[owner-form] No logo file to upload');
    }
    
    // Add gallery files (max 5)
    const galleryInput = document.getElementById('galleryFiles');
    if (galleryInput?.files?.length > 0) {
      Array.from(galleryInput.files).slice(0, 5).forEach(f => {
        fd.append('gallery[]', f);
      });
    }
    
    // Also add newFiles that were selected but not yet in input
    newFiles.slice(0, 5).forEach(f => {
      fd.append('gallery[]', f);
    });
    
    // Add document files
    const documentTypes = [
      { id: 'license-file', key: 'license' },
      { id: 'iban-file', key: 'iban' },
      { id: 'articles-file', key: 'articles' },
      { id: 'signature-file', key: 'signature_auth' },
      { id: 'civil-id-front-file', key: 'civil_id_front' },
      { id: 'civil-id-back-file', key: 'civil_id_back' },
      { id: 'owner-proof-file', key: 'owner_proof' }
    ];
    
    const uploadedDocuments = {};
    for (const { id, key } of documentTypes) {
      const input = document.getElementById(id);
      if (input?.files?.[0]) {
        const file = input.files[0];
        console.log(`[owner-form] Adding document: ${key}`, file.name);
        fd.append(key, file);
        uploadedDocuments[key] = file;
      }
    }
    
    // Log FormData contents for debugging
    console.log('[owner-form] FormData contents:');
    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // Save to localStorage instead of API
    const { getCurrentUser: getCurrentUserFromAuth, getBusinessByOwner, updateBusiness, saveBusinesses, getAllBusinesses, generateId } = await import('/js/auth-localstorage.js');
    const user = getCurrentUserFromAuth();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Convert FormData to object
    const businessData = {};
    const galleryFiles = [];
    
    for (const [key, value] of fd.entries()) {
      if (key.endsWith('[]')) {
        // Handle array fields (gallery)
        const fieldName = key.replace('[]', '');
        if (value instanceof File) {
          // Convert file to base64
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(value);
          });
          galleryFiles.push(base64);
        }
      } else if (value instanceof File) {
        // Convert file to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(value);
        });
        // Store files with appropriate field names
        if (key === 'logo') {
          businessData.logo_url = base64;
        } else {
          // Document files - store in a documents object
          if (!businessData.documents) businessData.documents = {};
          businessData.documents[key] = base64;
        }
      } else {
        // Regular form fields
        if (key === 'gallery[]') {
          // Skip - handled above
        } else {
          businessData[key] = value;
        }
      }
    }
    
    // Set gallery URLs
    if (galleryFiles.length > 0) {
      businessData.gallery_urls = galleryFiles;
    }
    
    // Get existing business or create new
    let business = getBusinessByOwner(user.id);
    
    // Clean up businessData - remove duplicate fields and handle special cases
    const cleanData = {
      name: businessData.name || businessData.business_name || '',
      business_name: businessData.name || businessData.business_name || '',
      description: businessData.description || '',
      story: businessData.story || '',
      industry: businessData.industry || businessData.category || '',
      category: businessData.category || businessData.industry || '',
      country: businessData.country || 'Kuwait',
      city: businessData.city || '',
      area: businessData.area || '',
      block: businessData.block || '',
      street: businessData.street || '',
      floor: businessData.floor || '',
      office_no: businessData.office_no || '',
      phone: businessData.phone || '',
      whatsapp: businessData.whatsapp || '',
      website: businessData.website || '',
      instagram: businessData.instagram || '',
      logo_url: businessData.logo_url || (business ? business.logo_url : null),
      gallery_urls: businessData.gallery_urls || [],
      updated_at: new Date().toISOString()
    };
    
    if (business) {
      // Update existing business
      business = updateBusiness(business.id, cleanData);
      console.log('[owner-form] Updated existing business:', business.id);
    } else {
      // Create new business
      const businesses = getAllBusinesses();
      business = {
        id: generateId(),
        owner_id: user.id,
        ...cleanData,
        status: 'pending',
        is_active: true,
        created_at: new Date().toISOString()
      };
      businesses.push(business);
      saveBusinesses(businesses);
      console.log('[owner-form] Created new business:', business.id);
    }
    
    const result = {
      ok: true,
      business: business,
      media: business.gallery_urls ? business.gallery_urls.map((url, idx) => ({
        id: idx.toString(),
        business_id: business.id,
        public_url: url,
        file_type: 'image',
        created_at: business.created_at
      })) : []
    };
    
    console.log('[owner-form] Profile saved successfully to localStorage:', result);
    console.log('[owner-form] Updated business data:', result.business);
    
    // Sync documents to admin dashboard
    const documentsWithUrls = {};
    if (businessData.documents) {
      for (const [docType, base64] of Object.entries(businessData.documents)) {
        documentsWithUrls[docType] = {
          url: base64,
          name: docType + '.png',
          size: 0,
          signedUrl: base64,
          path: base64
        };
      }
    }
    
    // Sync profile and document updates to admin dashboard (optional - file may not exist)
    try {
      const signupToAdminModule = await import('/js/signup-to-admin.js').catch(() => null);
      if (signupToAdminModule && signupToAdminModule.interceptSignup) {
        if (user && business) {
          // Update user profile in admin system with uploaded document URLs
          signupToAdminModule.interceptSignup({
            id: user.id,
            email: user.email,
            name: business.name || business.business_name || '',
            phone: business.phone || '',
            business_name: business.name || business.business_name || '',
            industry: business.industry || business.category || '',
            city: business.city || '',
            country: business.country || 'Kuwait',
            created_at: business.created_at || new Date().toISOString()
          }, documentsWithUrls);
          
          console.log('[owner-form] Profile and documents synced to admin dashboard');
        }
      }
    } catch (adminError) {
      // Silently ignore - signup-to-admin.js is optional
      console.log('[owner-form] Admin sync not available (optional feature)');
    }
    
    // Mark account as updated after fixing documents (for admin dashboard)
    try {
      if (user && user.id) {
        markAccountUpdatedAfterIssue(user.id);
      }
    } catch (err) {
      console.warn('[owner-form] Could not mark account as updated:', err);
    }
    
    // Clear any cached API responses before redirecting
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Verify business was saved before redirecting
    const savedBusiness = getBusinessByOwner(user.id);
    if (!savedBusiness) {
      console.error('[owner-form] Business was not saved correctly!');
      alert('Error: Business was not saved. Please try again.');
      return;
    }
    
    console.log('[owner-form] Business verified in localStorage:', savedBusiness.id);
    alert('Profile saved successfully! Redirecting to profile...');
    
    // Small delay to ensure localStorage is fully written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Always redirect to owner.html with cache-busting parameter to force reload
    // Use location.replace to prevent back button issues
    window.location.replace(`/owner.html?updated=${Date.now()}`);
  } catch (err) {
    console.error('[owner-form] Save error:', err);
    alert('Save failed: ' + (err.message || 'Unknown error'));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText || 'Save';
    }
  }
}

document.addEventListener('DOMContentLoaded', preloadEdit);
