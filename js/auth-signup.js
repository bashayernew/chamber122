// js/auth-signup.js - Signup handler using proper file upload flow
import { onCreateAccount, onCompleteSignup, missingRequiredDocs } from './signup-with-documents.js';

console.log('[auth-signup] Module loaded');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#signup-form');
  if (!form) {
    console.warn('[auth-signup] No #signup-form found');
    return;
  }

  // Find the create account button
  const createBtn = document.querySelector('#btnCreateAccount');
  if (!createBtn) {
    console.warn('[auth-signup] No #btnCreateAccount button found');
    return;
  }

  createBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Disable button and show loading
    const originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    createBtn.disabled = true;

    try {
      // Check for required documents
      const missing = missingRequiredDocs();
      if (missing.length > 0) {
        alert(`Please upload required documents: ${missing.join(', ')}`);
        return;
      }

      const emailEl = form.querySelector('#signup-email');
      const passwordEl = form.querySelector('#signup-password');
      const confirmPasswordEl = form.querySelector('#signup-confirm-password');
      const email = emailEl && emailEl.value ? emailEl.value.trim() : '';
      const password = passwordEl && passwordEl.value ? passwordEl.value : '';
      const confirmPassword = confirmPasswordEl && confirmPasswordEl.value ? confirmPasswordEl.value : '';

      if (!email || !password) {
        alert('Email and password are required');
        return;
      }

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      // Collect all business fields
      const getFieldValue = (selector) => {
        const el = form.querySelector(selector);
        return el && el.value ? el.value.trim() : null;
      };
      
      const fields = {
        name: getFieldValue('#signup-name'),
        business_name: getFieldValue('#signup-name'), // Also store as business_name for compatibility
        description: getFieldValue('#signup-desc'),
        story: getFieldValue('#signup-story'),
        country: getFieldValue('#signup-country') || 'Kuwait',
        city: getFieldValue('#signup-city'),
        area: getFieldValue('#signup-area'),
        block: getFieldValue('#signup-block'),
        street: getFieldValue('#signup-street'),
        floor: getFieldValue('#signup-floor'),
        office_no: getFieldValue('#signup-office-no'),
        industry: getFieldValue('#signup-category') || 'general',
        category: getFieldValue('#signup-category') || 'general', // Also store as category
        phone: getFieldValue('#signup-phone'),
        whatsapp: getFieldValue('#signup-whatsapp'),
        website: getFieldValue('#signup-website'),
        instagram: getFieldValue('#signup-instagram'),
      };

      console.log('[auth-signup] Collected fields:', fields);

      // 1) Create auth account
      let signupResult;
      try {
        signupResult = await onCreateAccount('#signup-email', '#signup-password');
      } catch (error) {
        console.error('[auth-signup] Signup error:', error);
        
        // Handle duplicate account (409 Conflict)
        if (error.message === 'ACCOUNT_EXISTS' || error.status === 409) {
          alert('This account already exists. Redirecting you to login.');
          window.location.href = '/auth.html#login';
          return;
        }
        
        // Show user-friendly error message
        const errorMsg = error.message || 'Failed to create account. Please check your internet connection and try again.';
        alert(`Signup Error:\n\n${errorMsg}`);
        return;
      }
      
      const { requiresConfirm, user } = signupResult || {};
      
      if (requiresConfirm) {
        alert('Account created! Please check your email to confirm, then log in to complete your profile.');
        return;
      }

      if (!user) {
        alert('Failed to create account. Please try again.');
        return;
      }

      console.log('[auth-signup] User signed up:', user.id);

      // 2) Complete signup with business data and files
      let business;
      try {
        business = await onCompleteSignup(fields);
        console.log('[auth-signup] Business created:', business);
      } catch (error) {
        console.error('[auth-signup] Business creation error:', error);
        alert('Account created but failed to save business information:\n\n' + (error.message || 'Please try editing your profile later.'));
        // Still redirect to owner-form page - user can complete profile there
        window.location.href = '/owner-form.html';
        return;
      }
      
      // Collect documents from state for storage
      const { state } = await import('./signup-with-documents.js');
      const documents = {};
      const docTypes = ['license', 'iban', 'articles', 'signature_auth', 'civil_id_front', 'civil_id_back', 'owner_proof'];
      
      for (const docType of docTypes) {
        if (state.uploaded[docType]) {
          const doc = state.uploaded[docType];
          // Store document info (file name, size, etc.) for pre-population
          documents[docType] = {
            name: (doc.file && doc.file.name) || doc.name || null,
            size: (doc.file && doc.file.size) || doc.size || null,
            type: (doc.file && doc.file.type) || doc.type || null,
            url: doc.url || doc.signedUrl || doc.publicUrl || null,
            hasFile: !!(doc.file)
          };
        }
      }
      
      // Get logo and gallery info
      const logoFile = (state.uploaded && state.uploaded.logo && state.uploaded.logo.file) ? state.uploaded.logo.file : null;
      const galleryFiles = state.galleryFiles || [];
      
      // Store signup form data for pre-population (including documents, logo, gallery)
      try {
        const signupData = {
          ...fields,
          logo: logoFile ? {
            name: logoFile.name,
            size: logoFile.size,
            type: logoFile.type,
            url: (state.uploaded && state.uploaded.logo && state.uploaded.logo.url) ? state.uploaded.logo.url : ((state.uploaded && state.uploaded.logo && state.uploaded.logo.signedUrl) ? state.uploaded.logo.signedUrl : null)
          } : null,
          gallery: galleryFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type
          })),
          documents: documents,
          timestamp: Date.now()
        };
        localStorage.setItem('chamber122_signup_data', JSON.stringify(signupData));
        console.log('[auth-signup] ✅ Stored signup data for pre-population:', {
          hasLogo: !!signupData.logo,
          galleryCount: signupData.gallery.length,
          documentCount: Object.keys(signupData.documents).filter(k => signupData.documents[k]).length,
          documentTypes: Object.keys(signupData.documents).filter(k => signupData.documents[k])
        });
      } catch (err) {
        console.warn('[auth-signup] Could not store signup data:', err);
      }
      
      // Also save user data and documents to admin system
      // NOTE: User is already saved by signup() in auth-localstorage.js
      // This just updates the user with additional fields
      try {
        const { saveSignupToAdmin, saveDocumentsToAdmin } = await import('./signup-to-admin.js');
        const { getAllUsers, updateUser } = await import('./auth-localstorage.js');
        
        // Update user with additional fields (user already exists from signup)
        const allUsers = getAllUsers();
        const existingUser = allUsers.find(u => u.id === user.id || u.email === user.email);
        
        if (existingUser) {
          // Update existing user with additional fields
          updateUser(existingUser.id, {
            name: fields.business_name || fields.name || existingUser.name || user.email.split('@')[0] || '',
            phone: fields.phone || fields.whatsapp || existingUser.phone || '',
            business_name: fields.business_name || fields.name || existingUser.business_name || '',
            industry: fields.industry || fields.category || existingUser.industry || '',
            city: fields.city || existingUser.city || '',
            country: fields.country || existingUser.country || 'Kuwait',
            updated_at: new Date().toISOString()
          });
          console.log('[auth-signup] ✅ User updated in admin system:', existingUser.id);
        } else {
          // User doesn't exist (shouldn't happen, but create it)
          const savedUser = saveSignupToAdmin({
            id: user.id,
            email: user.email,
            name: fields.business_name || fields.name || user.email.split('@')[0] || '',
            phone: fields.phone || fields.whatsapp || '',
            business_name: fields.business_name || fields.name || '',
            industry: fields.industry || fields.category || '',
            city: fields.city || '',
            country: fields.country || 'Kuwait',
            business_id: (business && business.id) || null,
            created_at: new Date().toISOString()
          });
          console.log('[auth-signup] ✅ User created in admin system:', savedUser && savedUser.id ? savedUser.id : 'unknown');
        }
        
        // Prepare documents with file references for admin system
        const adminDocuments = {};
        for (const docType of docTypes) {
          if (state.uploaded[docType]) {
            const doc = state.uploaded[docType];
            adminDocuments[docType] = {
              file: doc.file || null,
              name: (doc.file && doc.file.name) || doc.name || null,
              url: doc.url || doc.signedUrl || doc.publicUrl || doc.base64 || null,
              base64: doc.base64 || null
            };
          }
        }
        
        // Save documents to admin system
        if (Object.keys(adminDocuments).length > 0) {
          const businessId = (business && business.id) || user.id;
          await saveDocumentsToAdmin(user.id, businessId, adminDocuments);
          console.log('[auth-signup] ✅ Documents saved to admin system');
        }
      } catch (adminError) {
        console.error('[auth-signup] Could not save to admin system:', adminError);
        // Don't fail signup if admin save fails
      }
      
      // 3) Redirect to owner-form page to complete profile
      alert('Account created successfully! Redirecting to complete your profile...');
      window.location.href = '/owner-form.html';
      
    } catch (error) {
      console.error('[auth-signup] Signup error:', error);
      alert('Error creating account: ' + (error.message || 'Please try again'));
    } finally {
      // Restore button state
      createBtn.innerHTML = originalText;
      createBtn.disabled = false;
    }
  });
});

