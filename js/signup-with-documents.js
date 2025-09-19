import { uploadTempDoc } from './file-upload.js';
import { signupWithEmailPassword, resendConfirmation } from './auth-signup-utils.js';
import { createBusinessRecord } from './businesses-utils.js';
import { isEmailConfirmationBypassed } from './auth-dev.js';

export const state = { localPreviews: {}, uploaded: {} };

function wireOneInput(el) {
  console.log(`Wiring file input: ${el.id} (${el.dataset.doc})`);
  
  el.addEventListener('change', async (e) => {
    console.log(`File input changed: ${e.target.id}`);
    const file = e.target.files?.[0];
    const type = e.target.dataset.doc; // "license" | "iban" | "signature_auth" | "articles" | "logo"
    
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    if (!type) {
      console.log('No document type specified');
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
    
    // Special handling for logo preview
    if (type === 'logo') {
      const logoPreview = document.getElementById('logo-preview');
      const logoStatus = document.getElementById('logo-upload-status');
      
      if (logoPreview) {
        // Clean up previous URL to prevent memory leaks
        if (logoPreview.src && logoPreview.src.startsWith('blob:')) {
          URL.revokeObjectURL(logoPreview.src);
        }
        
        logoPreview.src = localUrl;
        logoPreview.classList.remove('hidden');
        logoPreview.style.display = 'block';
        logoPreview.style.maxWidth = '200px';
        logoPreview.style.maxHeight = '120px';
        logoPreview.style.borderRadius = '8px';
        logoPreview.style.marginTop = '0.5rem';
      }
    } else {
      // Local preview for other documents
      const img = document.querySelector(`[data-local-preview="${type}"]`);
      if (img) {
        // Clean up previous URL to prevent memory leaks
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
        img.src = localUrl;
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

      // Special handling for logo success
      if (type === 'logo') {
        const logoStatus = document.getElementById('logo-upload-status');
        if (logoStatus) {
          logoStatus.style.display = 'block';
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

export function initSignupPage() {
  console.log('Initializing signup page...');
  
  // Ensure your inputs have these attributes in HTML:
  // id="licenseInput" data-doc="license"
  // id="ibanInput" data-doc="iban"
  // id="signatureAuthInput" data-doc="signature_auth"
  // id="articlesInput" data-doc="articles"
  // (optional) id="logoInput" data-doc="logo"
  const fileInputs = document.querySelectorAll('input[type="file"][data-doc]');
  console.log(`Found ${fileInputs.length} file inputs:`, fileInputs);
  
  fileInputs.forEach((input, index) => {
    console.log(`Wiring input ${index + 1}:`, input.id, input.dataset.doc);
    wireOneInput(input);
  });
  
  // Cleanup blob URLs when page is unloaded
  window.addEventListener('beforeunload', () => {
    // Clean up any blob URLs to prevent memory leaks
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
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
  const required = ['license', 'iban', 'signature_auth', 'articles'];
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
    // TODO: Re-enable email confirmation in production
    if (isEmailConfirmationBypassed()) {
      // Development mode - bypass email confirmation
      const { requiresConfirm, user } = await signupWithEmailPassword(email, password);
      console.log('DEV: User signed up and auto-confirmed:', user?.id);
      
      // User is immediately signed in, proceed to complete signup
      return { requiresConfirm: false, user };
    } else {
      // Production mode - normal signup with email confirmation
      const { requiresConfirm, user } = await signupWithEmailPassword(email, password);
      
      if (requiresConfirm) {
        // Show email confirmation UI
        showEmailConfirmationUI(email);
        return { requiresConfirm: true, user };
      } else {
        // User is immediately signed in
        return { requiresConfirm: false, user };
      }
    }
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
  // Attach uploaded logo path if present
  const logoPath = state.uploaded.logo?.path ?? null;
  const row = await createBusinessRecord({
    ...fields,
    logo_url: fields.logo_url ?? logoPath,
  });
  return row;
}