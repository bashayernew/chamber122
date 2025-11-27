import { signupWithEmailPassword, signInWithPassword, resendConfirmation } from './src/lib/auth-signup-utils.js';
import { initSignupPage, missingRequiredDocs, onCreateAccount, onCompleteSignup } from './signup-with-documents.js';

// Document upload state
const uploadState = { uploaded: {} };

// Initialize the signup page
export function initAuthSignup() {
  // Initialize document uploads
  initSignupPage();
  
  // Wire up the create account button
  const createAccountBtn = document.getElementById('btnCreateAccount');
  if (createAccountBtn) {
    createAccountBtn.addEventListener('click', handleCreateAccount);
  }
  
  // Wire up the complete signup button (shown after email confirmation)
  const completeSignupBtn = document.getElementById('btnCompleteSignup');
  if (completeSignupBtn) {
    completeSignupBtn.addEventListener('click', handleCompleteSignup);
  }
  
  // Wire up login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

async function handleCreateAccount(e) {
  e.preventDefault();
  
  const email = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirmPassword = document.getElementById('signup-confirm-password')?.value;
  
  // Validate form
  if (!email || !password || !confirmPassword) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  // Check required documents
  const missing = missingRequiredDocs();
  if (missing.length > 0) {
    alert(`Please upload all required documents: ${missing.join(', ')}`);
    return;
  }
  
  // Disable button and show loading
  const btn = e.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
  btn.disabled = true;
  
  try {
    const { requiresConfirm, user } = await onCreateAccount('#signup-email', '#signup-password');
    
    if (requiresConfirm) {
      // Show email confirmation UI
      showEmailConfirmationUI(email);
    } else {
      // User is immediately signed in, proceed to complete signup
      await completeSignupProcess(user);
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Signup failed: ' + error.message);
  } finally {
    // Restore button
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
  btn.disabled = true;
  
  try {
    await signInWithPassword(email, password);
    // Redirect to owner activities
    window.location.href = '/owner.html';
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function handleCompleteSignup(e) {
  e.preventDefault();
  
  try {
    // Get form data
    const formData = collectSignupFormData();
    
    // Complete the signup process
    await completeSignupProcess(null, formData);
  } catch (error) {
    console.error('Complete signup error:', error);
    alert('Failed to complete signup: ' + error.message);
  }
}

function collectSignupFormData() {
  return {
    name: document.getElementById('signup-name')?.value?.trim() || 
          document.getElementById('signup-business-name')?.value?.trim() ||
          document.getElementById('signup-legal-name')?.value?.trim(),
    category: document.getElementById('signup-category')?.value || 
              document.getElementById('signup-industry')?.value,
    country: document.getElementById('signup-country')?.value || 'Kuwait',
    city: document.getElementById('signup-city')?.value?.trim(),
    description: document.getElementById('signup-desc')?.value?.trim(),
    whatsapp: document.getElementById('signup-whatsapp')?.value?.trim(),
    phone: document.getElementById('signup-phone')?.value?.trim(),
    email: document.getElementById('signup-email')?.value?.trim(),
    industry: document.getElementById('signup-industry')?.value || 
              document.getElementById('signup-category')?.value,
    // Add other form fields as needed
  };
}

async function completeSignupProcess(user, formData = null) {
  try {
    // If no user provided, get current user
    if (!user) {
      const { getCurrentUser } = await import('./src/lib/auth-signup-utils.js');
      user = await getCurrentUser();
    }
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Collect form data if not provided
    if (!formData) {
      formData = collectSignupFormData();
    }
    
    // Get logo and gallery files from state
    const { state } = await import('./signup-with-documents.js');
    const logoFile = state.uploaded.logo?.file || null;
    const galleryFiles = state.galleryFiles || [];
    
    // Complete the business signup (this uploads logo and gallery)
    const business = await onCompleteSignup({
      ...formData,
      owner_id: user.id,
      email: user.email,
      logo_file: logoFile, // Pass logo file
      gallery_files: galleryFiles // Pass gallery files
    });
    
    console.log('[signup] Business created:', business?.id, business?.name);
    
    // Store signup form data in localStorage for pre-populating owner-form
    try {
      const signupData = {
        ...formData,
        logo_file: logoFile ? { name: logoFile.name, size: logoFile.size, type: logoFile.type } : null,
        gallery_files_count: galleryFiles.length,
        timestamp: Date.now()
      };
      localStorage.setItem('chamber122_signup_data', JSON.stringify(signupData));
      console.log('[signup] Stored signup data for pre-population:', signupData);
    } catch (err) {
      console.warn('[signup] Could not store signup data:', err);
    }
    
    // Upload documents to backend and get their URLs
    const { state } = await import('./signup-with-documents.js');
    const { uploadFile } = await import('./api.js');
    const uploadedDocuments = {};
    
    // Upload documents that were stored in state
    const docTypes = ['license', 'iban', 'articles', 'signature_auth', 'civil_id_front', 'civil_id_back', 'owner_proof'];
    
    for (const docType of docTypes) {
      if (state.uploaded[docType]) {
        try {
          // Get the file from state
          let file = null;
          
          // Try to get file object directly
          if (state.uploaded[docType].file) {
            file = state.uploaded[docType].file;
          } else {
            // Try to get from file input
            const inputId = `${docType}-file` || `${docType.replace('_', '-')}-file`;
            const input = document.getElementById(inputId);
            if (input?.files?.[0]) {
              file = input.files[0];
            } else if (state.uploaded[docType].fallbackKey) {
              // Get from sessionStorage
              const fileData = sessionStorage.getItem(state.uploaded[docType].fallbackKey);
              if (fileData) {
                const parsed = JSON.parse(fileData);
                if (parsed.localUrl) {
                  const response = await fetch(parsed.localUrl);
                  const blob = await response.blob();
                  file = new File([blob], parsed.name, { type: parsed.type });
                }
              }
            }
          }
          
          if (file) {
            console.log(`[signup] Uploading document: ${docType}`, file.name);
            try {
              const uploadResult = await uploadFile(file, docType, business?.id);
              const fileUrl = uploadResult.publicUrl || uploadResult.public_url || uploadResult.url || uploadResult.path;
              
              // Ensure we have a real URL (not blob)
              if (fileUrl && !fileUrl.startsWith('blob:') && fileUrl !== '#') {
                uploadedDocuments[docType] = {
                  url: fileUrl,
                  name: file.name,
                  size: file.size,
                  signedUrl: fileUrl,
                  path: fileUrl,
                  publicUrl: fileUrl,
                  public_url: fileUrl,
                  file: file // Keep file reference for admin system
                };
                console.log(`[signup] ✅ Document uploaded successfully: ${docType} -> ${fileUrl}`);
              } else {
                console.warn(`[signup] ⚠️ Document upload returned invalid URL for ${docType}:`, fileUrl);
                // Still save with file info, URL will be added later
                uploadedDocuments[docType] = {
                  name: file.name,
                  size: file.size,
                  file: file
                };
              }
            } catch (uploadErr) {
              console.error(`[signup] Error uploading ${docType}:`, uploadErr);
              // Save file info even if upload fails - admin can see it was attempted
              uploadedDocuments[docType] = {
                name: file.name,
                size: file.size,
                file: file,
                uploadError: uploadErr.message
              };
            }
          }
        } catch (err) {
          console.error(`[signup] Error uploading document ${docType}:`, err);
          // Still save to admin with whatever data we have
          uploadedDocuments[docType] = state.uploaded[docType];
        }
      }
    }
    
    // Save to admin system (localStorage) with uploaded document URLs
    try {
      const { interceptSignup } = await import('./signup-to-admin.js');
      
      // Prepare documents data - prioritize uploaded URLs with real URLs
      const documents = {};
      const docTypes = ['license', 'iban', 'articles', 'signature_auth', 'civil_id_front', 'civil_id_back', 'owner_proof'];
      
      for (const docType of docTypes) {
        // Prefer uploaded document with real URL, then uploaded without URL, then state
        const uploaded = uploadedDocuments[docType];
        const stateDoc = state.uploaded[docType];
        
        if (uploaded) {
          // If uploaded has a real URL, use it
          if (uploaded.url && !uploaded.url.startsWith('blob:') && uploaded.url !== '#') {
            documents[docType] = uploaded;
            console.log(`[signup] ✅ Using uploaded document with URL for ${docType}:`, uploaded.url.substring(0, 50));
          } else if (uploaded.file) {
            // Has file but no URL yet - save file info (IMPORTANT: This ensures it shows in admin dashboard)
            documents[docType] = uploaded;
            console.log(`[signup] ✅ Using uploaded document with file for ${docType} (file: ${uploaded.file.name}, URL will be added later)`);
          } else {
            // Fallback to state
            documents[docType] = stateDoc;
            if (stateDoc) {
              console.log(`[signup] Using state document for ${docType} (from state)`);
            }
          }
        } else if (stateDoc) {
          // IMPORTANT: Save documents from state even if they only have file objects
          // This ensures they appear in admin dashboard immediately
          documents[docType] = stateDoc;
          console.log(`[signup] ✅ Using state document for ${docType}:`, {
            hasFile: !!(stateDoc.file),
            hasUrl: !!(stateDoc.url || stateDoc.signedUrl),
            fileName: stateDoc.file?.name || stateDoc.name || 'unknown'
          });
        }
      }
      
      const docCount = Object.keys(documents).filter(k => documents[k]).length;
      console.log('[signup] 📋 Saving to admin system with documents:', docCount, 'documents');
      console.log('[signup] Document types:', Object.keys(documents).filter(k => documents[k]));
      console.log('[signup] Document details:', Object.entries(documents).map(([k, v]) => ({
        type: k,
        hasFile: !!(v?.file),
        hasUrl: !!(v?.url || v?.signedUrl || v?.publicUrl),
        fileName: v?.file?.name || v?.name || 'unknown'
      })));
      
      // Save user and documents to admin system
      const savedUser = interceptSignup({
        id: user.id || `user_${Date.now()}`,
        email: user.email,
        name: formData.name || user.user_metadata?.full_name || '',
        phone: formData.phone || formData.whatsapp || '',
        business_name: formData.name || business?.name || '',
        industry: formData.category || formData.industry || '',
        city: formData.city || '',
        country: formData.country || 'Kuwait',
        business_id: business?.id || null,
        created_at: new Date().toISOString()
      }, documents);
      
      console.log('[signup] ✅ User and documents saved to admin system. User ID:', savedUser?.id);
      console.log('[signup] Documents saved:', Object.keys(documents).filter(k => documents[k]).map(k => {
        const doc = documents[k];
        return `${k}: ${doc?.url && !doc.url.startsWith('blob:') ? '✅ has URL' : doc?.file ? '📄 has file' : '❌ missing'}`;
      }));
      
      // Force admin dashboard refresh if it's open (same tab)
      window.dispatchEvent(new CustomEvent('userSignup', { detail: savedUser }));
      if (docCount > 0) {
        window.dispatchEvent(new CustomEvent('documentsUpdated', { detail: Object.values(documents).filter(d => d) }));
      }
      
      console.log('[signup] Saved to admin system successfully');
    } catch (adminError) {
      console.error('[signup] Could not save to admin system:', adminError);
      // Don't fail the signup if admin save fails
    }
    
    // Store signup form data for pre-population in owner-form
    try {
      const signupData = {
        ...formData,
        timestamp: Date.now()
      };
      localStorage.setItem('chamber122_signup_data', JSON.stringify(signupData));
      console.log('[signup] Stored signup data for pre-population in owner-form');
    } catch (err) {
      console.warn('[signup] Could not store signup data:', err);
    }
    
    // Show success message
    alert('Account created successfully! Please complete your business profile...');
    
    // Redirect to owner-form to complete/edit profile
    window.location.href = '/owner-form.html';
    
  } catch (error) {
    console.error('Complete signup process error:', error);
    throw error;
  }
}

function showEmailConfirmationUI(email) {
  // Hide the signup form
  const signupForm = document.getElementById('signup-form');
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
        <button id="btnCompleteSignup" class="btn btn-primary" style="padding: 0.5rem 1rem; display: none;">
          Complete Signup
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
  
  // Show complete signup button after a delay (user might have clicked email link)
  setTimeout(() => {
    const completeBtn = document.getElementById('btnCompleteSignup');
    if (completeBtn) {
      completeBtn.style.display = 'inline-block';
    }
  }, 2000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuthSignup);
