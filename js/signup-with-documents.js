import { uploadTempDoc } from './file-upload.js';
import { signupWithEmailPassword, resendConfirmation } from './auth-signup-utils.js';
import { createBusinessRecord } from './businesses-utils.js';
import { isEmailConfirmationBypassed } from './auth-dev.js';

export const state = { localPreviews: {}, uploaded: {}, galleryFiles: [] };

function wireOneInput(el) {
  console.log(`Wiring file input: ${el.id} (${el.dataset.doc})`);
  
  el.addEventListener('change', async (e) => {
    console.log(`File input changed: ${e.target.id}`);
    const type = e.target.dataset.doc; // "license" | "iban" | "signature_auth" | "articles" | "logo" | "gallery"
    
    if (!type) {
      console.log('No document type specified');
      return;
    }
    
    // For gallery, handle multiple files separately (only preview, no upload to temp)
    if (type === 'gallery') {
      // Handle gallery files (multiple) - accumulate files
      const galleryPreview = document.getElementById('gallery-preview');
      if (!galleryPreview || !e.target.files || e.target.files.length === 0) {
        console.warn('[signup] Gallery preview element not found or no files');
        // Reset input to allow selecting same files again
        e.target.value = '';
        return;
      }
      
      const newFiles = Array.from(e.target.files);
      const MAX_GALLERY = 5;
      const currentCount = state.galleryFiles.length;
      const remainingSlots = MAX_GALLERY - currentCount;
      
      if (remainingSlots <= 0) {
        alert(`You can only add up to ${MAX_GALLERY} gallery images. Please remove some images first.`);
        e.target.value = '';
        return;
      }
      
      // Add new files up to the limit
      const filesToAdd = newFiles.slice(0, remainingSlots);
      if (newFiles.length > remainingSlots) {
        alert(`You can only add ${remainingSlots} more image(s). Maximum ${MAX_GALLERY} images allowed.`);
      }
      
      // Add new files to state
      state.galleryFiles = [...state.galleryFiles, ...filesToAdd];
      console.log('[signup] Gallery files now:', state.galleryFiles.length, 'total');
      
      // Render all gallery previews
      console.log('[signup] Rendering gallery preview with', state.galleryFiles.length, 'files');
      renderGalleryPreview(galleryPreview);
      
      // Reset input to allow selecting same files again
      e.target.value = '';
      return; // Don't proceed with upload for gallery files
    }
    
    // For non-gallery files, get single file
    const file = e.target.files?.[0];
    
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    console.log(`Processing file: ${file.name} (${file.size} bytes) for type: ${type}`);
    
    // Show loading state
    const status = document.querySelector(`[data-upload-status="${type}"]`);
    const progress = document.getElementById(`${type}-progress`);
    
    if (status) {
      status.textContent = 'Uploading...';
      status.style.color = '#f59e0b';
    }
    
    if (progress) {
      progress.style.display = 'block';
    }

    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    
    // Show preview immediately for documents (before upload completes)
    if (type !== 'logo' && type !== 'gallery') {
      const previewContainer = document.getElementById(`${type}-preview`) || 
                               document.getElementById(`${type === 'articles' ? 'incorporation' : type === 'signature_auth' ? 'signature' : type}-preview`);
      const img = previewContainer?.querySelector(`[data-local-preview="${type}"]`);
      const fileName = previewContainer?.querySelector('.file-name');
      const fileLink = previewContainer?.querySelector('.file-link');
      
      if (previewContainer) {
        previewContainer.style.display = 'block';
      }
      
      // Check if file is an image
      const isImage = file.type.startsWith('image/');
      
      if (isImage && img) {
        // Clean up previous URL to prevent memory leaks
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
        img.src = localUrl;
        img.style.display = 'block';
      } else if (img) {
        // Hide image preview for non-image files
        img.style.display = 'none';
      }
      
      // Show file name immediately
      if (fileName) {
        fileName.textContent = file.name;
      }
      
      // Set file link to preview URL
      if (fileLink) {
        fileLink.href = localUrl;
        fileLink.download = file.name;
      }
    }
    
    // Special handling for logo preview
    if (type === 'logo') {
      console.log('[signup] Processing logo file:', file.name);
      const logoPreview = document.getElementById('logo-preview');
      const logoStatus = document.getElementById('logo-upload-status');
      
      console.log('[signup] Logo preview element found:', !!logoPreview);
      
      if (logoPreview) {
        // Clean up previous URL to prevent memory leaks
        if (logoPreview.src && logoPreview.src.startsWith('blob:')) {
          URL.revokeObjectURL(logoPreview.src);
        }
        
        // Set the image source first
        logoPreview.src = localUrl;
        
        // Remove hidden class
        logoPreview.classList.remove('hidden');
        
        // Force visibility with inline styles - build complete style string
        const styleString = [
          'display: block',
          'visibility: visible',
          'opacity: 1',
          'max-width: 200px',
          'max-height: 120px',
          'border-radius: 8px',
          'margin-top: 0.5rem',
          'object-fit: contain',
          'border: 2px solid rgba(212, 175, 55, 0.3)',
          'padding: 0.5rem',
          'background: rgba(255, 255, 255, 0.05)'
        ].join('; ');
        
        logoPreview.setAttribute('style', styleString);
        
        // Also set individual properties as backup
        logoPreview.style.display = 'block';
        logoPreview.style.visibility = 'visible';
        logoPreview.style.opacity = '1';
        
        console.log('[signup] Logo preview updated:', file.name, 'URL:', localUrl);
        console.log('[signup] Logo preview element:', {
          display: logoPreview.style.display,
          visibility: logoPreview.style.visibility,
          hasSrc: !!logoPreview.src,
          computedDisplay: window.getComputedStyle(logoPreview).display
        });
      } else {
        console.error('[signup] Logo preview element not found!');
      }
      
      // Store file in state for later upload
      if (!state.uploaded.logo) state.uploaded.logo = {};
      state.uploaded.logo.file = file;
      console.log('[signup] Logo file stored in state:', file.name, file.size);
    } else {
      // Preview already shown above, just add remove button handler
      const previewContainer = document.getElementById(`${type}-preview`) || 
                               document.getElementById(`${type === 'articles' ? 'incorporation' : type === 'signature_auth' ? 'signature' : type}-preview`);
      const img = previewContainer?.querySelector(`[data-local-preview="${type}"]`);
      
      // Add remove button handler
      const removeBtn = previewContainer?.querySelector('.remove-file');
      if (removeBtn && !removeBtn.dataset.handlerAdded) {
        removeBtn.dataset.handlerAdded = 'true';
        removeBtn.addEventListener('click', () => {
          // Clear file input
          el.value = '';
          
          // Hide preview container
          if (previewContainer) {
            previewContainer.style.display = 'none';
          }
          
          // Clean up blob URL
          if (localUrl) {
            URL.revokeObjectURL(localUrl);
          }
          
          // Clear state
          delete state.uploaded[type];
          
          // Reset status
          if (status) {
            status.textContent = 'Required';
            status.style.color = '#9ca3af';
          }
          
          // Hide image preview
          if (img) {
            img.src = '';
            img.style.display = 'none';
          }
          
          // Clear file name
          const fileName = previewContainer?.querySelector('.file-name');
          if (fileName) {
            fileName.textContent = '';
          }
        });
      }
    }

    // Upload to temp/ (now using local storage)
    try {
      console.log(`Starting upload for ${type}...`);
      
      const res = await uploadTempDoc(file, type);
      console.log(`Upload completed for ${type}:`, res);
      
      // Always hide progress indicator first
      if (progress) {
        progress.style.display = 'none';
        console.log(`Hiding progress for ${type}`);
      }
      
      // Since we're using local storage, always show this message
      console.log(`File saved locally for ${type}`);
      if (status) {
        status.textContent = 'File ready ✓';
        status.style.color = '#22c55e';
      }
      
      state.uploaded[type] = res;
      
      // Store the file reference for later upload
      if (type === 'logo') {
        state.uploaded.logo.file = file; // Store the actual file object
      }

      // Special handling for logo success
      if (type === 'logo') {
        const logoStatus = document.getElementById('logo-upload-status');
        if (logoStatus) {
          logoStatus.style.display = 'block';
        }
      }

      // Show preview container for documents (already shown above, but ensure it's visible)
      if (type !== 'logo' && type !== 'gallery') {
        const previewContainer = document.getElementById(`${type}-preview`) || 
                                 document.getElementById(`${type === 'articles' ? 'incorporation' : type === 'signature_auth' ? 'signature' : type}-preview`);
        if (previewContainer) {
          previewContainer.style.display = 'block';
        }
      }

      const link = document.querySelector(`[data-upload-preview="${type}"]`);
      if (link && res.signedUrl) {
        link.href = res.signedUrl;
        link.textContent = 'Preview';
      }
    } catch (err) {
      console.error('Upload failed', type, err);
      
      // Hide progress indicator
      if (progress) {
        progress.style.display = 'none';
      }
      
      // Update status to show error
      if (status) {
        status.textContent = 'Upload failed';
        status.style.color = '#ef4444';
      }
      
      // Clean up blob URL on error
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
      
      alert(err.message || 'Upload failed');
    }
  });
}

// Render gallery preview with all accumulated files
function renderGalleryPreview(galleryPreview) {
  if (!galleryPreview) return;
  
  galleryPreview.innerHTML = ''; // Clear existing previews
  
  if (state.galleryFiles.length === 0) {
    galleryPreview.style.display = 'none';
    return;
  }
  
  galleryPreview.style.display = 'grid';
  galleryPreview.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
  galleryPreview.style.gap = '0.5rem';
  galleryPreview.style.marginTop = '0.5rem';
  
  state.galleryFiles.forEach((galleryFile, index) => {
    const fileUrl = URL.createObjectURL(galleryFile);
    
    // Create container for each image
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100px';
    container.style.height = '100px';
    
    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    img.style.border = '2px solid rgba(212, 175, 55, 0.3)';
    img.style.display = 'block';
    img.style.cursor = 'pointer';
    img.alt = `Gallery preview ${index + 1}`;
    img.title = galleryFile.name;
    
    // Add click handler to view full image
    img.addEventListener('click', () => {
      window.open(fileUrl, '_blank');
    });
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      border: 2px solid white;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Clean up blob URL
      URL.revokeObjectURL(fileUrl);
      
      // Remove file from state
      state.galleryFiles = state.galleryFiles.filter((_, i) => i !== index);
      
      // Re-render preview
      renderGalleryPreview(galleryPreview);
      
      console.log('[signup] Removed gallery image, remaining:', state.galleryFiles.length);
    });
    
    container.appendChild(img);
    container.appendChild(removeBtn);
    galleryPreview.appendChild(container);
  });
  
  console.log('[signup] Gallery preview rendered with', state.galleryFiles.length, 'images');
}

export function initSignupPage() {
  console.log('[signup] Initializing signup page...');
  
  // Ensure your inputs have these attributes in HTML:
  // id="licenseInput" data-doc="license"
  // id="ibanInput" data-doc="iban"
  // id="signatureAuthInput" data-doc="signature_auth"
  // id="articlesInput" data-doc="articles"
  // (optional) id="logoInput" data-doc="logo"
  const fileInputs = document.querySelectorAll('input[type="file"][data-doc]');
  console.log(`[signup] Found ${fileInputs.length} file inputs:`, Array.from(fileInputs).map(inp => ({ id: inp.id, doc: inp.dataset.doc })));
  
  if (fileInputs.length === 0) {
    console.warn('[signup] No file inputs found with data-doc attribute!');
    return;
  }
  
  fileInputs.forEach((input, index) => {
    console.log(`[signup] Wiring input ${index + 1}:`, input.id, input.dataset.doc);
    wireOneInput(input);
  });
  
  // Initialize gallery preview if there are existing files
  const galleryPreview = document.getElementById('gallery-preview');
  if (galleryPreview && state.galleryFiles.length > 0) {
    renderGalleryPreview(galleryPreview);
  }
  
  // Cleanup blob URLs when page is unloaded
  window.addEventListener('beforeunload', () => {
    // Clean up any blob URLs to prevent memory leaks
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    
    // Clear gallery files state
    state.galleryFiles = [];
  });

  // Initialize character counter for description
  const descTextarea = document.getElementById('signup-desc');
  const descCounter = document.getElementById('desc-counter');
  
  if (descTextarea && descCounter) {
    descTextarea.addEventListener('input', function() {
      const length = this.value.length;
      descCounter.textContent = `${length}/140`;
      
      // Change color based on length using existing CSS classes
      descCounter.classList.remove('valid', 'invalid');
      if (length > 140) {
        descCounter.classList.add('invalid');
      } else if (length >= 50) {
        descCounter.classList.add('valid');
      }
    });
  }
}

export function missingRequiredDocs() {
  const required = ['license', 'iban', 'signature_auth', 'articles', 'civil_id_front', 'civil_id_back', 'owner_proof'];
  return required.filter((k) => !state.uploaded[k]?.path);
}

export async function onCreateAccount(emailSelector, passwordSelector) {
  const missing = missingRequiredDocs();
  if (missing.length) {
    alert(`Please upload required documents: ${missing.join(', ')}`);
    throw new Error('Required documents missing');
  }
  
  const email = document.querySelector(emailSelector)?.value?.trim();
  const password = document.querySelector(passwordSelector)?.value;
  
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  try {
    // Signup with backend API (no email confirmation needed)
    const { requiresConfirm, user } = await signupWithEmailPassword(email, password);
    console.log('[signup] User signed up:', user?.id);
    
    // User is immediately signed in, proceed to complete signup
    return { requiresConfirm: false, user };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

function showEmailConfirmationUI(email) {
  // Hide the signup form
  const signupForm = document.querySelector('#signup-form');
  if (signupForm) {
    signupForm.style.display = 'none';
  }
  
  // Create confirmation UI
  const confirmationDiv = document.createElement('div');
  confirmationDiv.id = 'email-confirmation';
  confirmationDiv.innerHTML = `
    <div style="text-align: center; padding: 2rem; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; margin: 1rem 0;">
      <h3 style="color: #0369a1; margin-bottom: 1rem;">Check Your Email</h3>
      <p style="color: #0c4a6e; margin-bottom: 1rem;">
        We've sent a confirmation link to <strong>${email}</strong>
      </p>
      <p style="color: #0c4a6e; margin-bottom: 1.5rem;">
        Click the link in your email to complete your account setup, then return here to finish your business listing.
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button id="resend-confirmation" class="btn btn-outline" style="padding: 0.5rem 1rem;">
          Resend Email
        </button>
        <button id="back-to-signup" class="btn btn-ghost" style="padding: 0.5rem 1rem;">
          Back to Signup
        </button>
      </div>
    </div>
  `;
  
  // Insert after the form
  if (signupForm) {
    signupForm.parentNode.insertBefore(confirmationDiv, signupForm.nextSibling);
  }
  
  // Add event listeners
  document.getElementById('resend-confirmation')?.addEventListener('click', async () => {
    try {
      await resendConfirmation(email);
      alert('Confirmation email resent!');
    } catch (error) {
      alert('Error resending email: ' + error.message);
    }
  });
  
  document.getElementById('back-to-signup')?.addEventListener('click', () => {
    confirmationDiv.remove();
    if (signupForm) {
      signupForm.style.display = 'block';
    }
  });
}

export async function onCompleteSignup(fields) {
  // Get logo file from state if available
  let logoFile = null;
  if (state.uploaded.logo) {
    // First try to get the file object stored in state
    if (state.uploaded.logo.file) {
      logoFile = state.uploaded.logo.file;
      console.log('[signup] Logo file found in state:', logoFile.name);
    } else {
      // Try to get the actual file from the file input
      const logoInput = document.getElementById('logo-file');
      if (logoInput && logoInput.files && logoInput.files.length > 0) {
        logoFile = logoInput.files[0];
        console.log('[signup] Logo file found from input:', logoFile.name);
      } else {
        // Try to get from sessionStorage fallback
        const fallbackKey = state.uploaded.logo.fallbackKey;
        if (fallbackKey) {
          const fileData = sessionStorage.getItem(fallbackKey);
          if (fileData) {
            try {
              const parsed = JSON.parse(fileData);
              if (parsed.localUrl) {
                // Fetch the blob from the local URL
                const response = await fetch(parsed.localUrl);
                const blob = await response.blob();
                logoFile = new File([blob], parsed.name, { type: parsed.type });
                console.log('[signup] Logo file retrieved from sessionStorage');
              }
            } catch (err) {
              console.error('[signup] Error retrieving logo from sessionStorage:', err);
            }
          }
        }
      }
    }
  }

  // Get gallery files from state (accumulated from multiple selections)
  const galleryFiles = state.galleryFiles || [];
  console.log('[signup] Gallery files from state:', galleryFiles.length);
  
  const row = await createBusinessRecord({
    ...fields,
    logo_file: logoFile, // Pass the actual file for upload
    logo_url: fields.logo_url ?? state.uploaded.logo?.signedUrl ?? null,
    gallery_files: galleryFiles, // Pass gallery files for upload
  });
  
  console.log('[signup] Business created with logo:', row.logo_url);
  return row;
}
