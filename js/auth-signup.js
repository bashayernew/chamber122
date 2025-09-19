// auth-signup.js
import {
  initSignupPage,
  onCreateAccount,
  onCompleteSignup,
} from './signup-with-documents.js';

document.addEventListener('DOMContentLoaded', () => {
  initSignupPage();

  // Check if user is returning from email confirmation
  const urlParams = new URLSearchParams(window.location.search);
  const step = urlParams.get('step');
  if (step === 'complete') {
    // User is returning from email confirmation, show complete button
    document.querySelector('#btnCreateAccount')?.style.setProperty('display', 'none');
    document.querySelector('#btnCompleteSignup')?.style.setProperty('display', 'block');
  }

  // Create account (requires email/password and that all required docs were uploaded)
  document.querySelector('#btnCreateAccount')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const result = await onCreateAccount('#signup-email', '#signup-password');
      
      // TODO: Re-enable email confirmation in production
      if (!result.requiresConfirm) {
        console.log('Auto-completing signup process...');
        
        // Immediately complete the signup with business data
        const fields = {
          business_name: document.querySelector('#signup-name')?.value?.trim(),
          industry: document.querySelector('#signup-category')?.value?.trim() || null,
          country: document.querySelector('#signup-country')?.value?.trim() || null,
          city: document.querySelector('#signup-city')?.value?.trim() || null,
          short_description: document.querySelector('#signup-desc')?.value?.trim() || null,
          description: document.querySelector('#signup-desc')?.value?.trim() || null,
          whatsapp: document.querySelector('#signup-whatsapp')?.value?.trim() || null,
          // logo_url will be auto-filled from uploaded state if not provided
        };
        
        const businessRow = await onCompleteSignup(fields);
        console.log('Business created:', businessRow);
        alert('Account created and business profile completed! You are now signed in.');
        
        // Redirect to owner activities dashboard
        window.location.href = '/owner-activities.html';
        return;
      }
      
      // Email confirmation required
      alert('Account created. Check your email and click the confirmation link, then return here to complete signup.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Signup failed');
    }
  });

  // Complete signup (requires user to be signed in)
  document.querySelector('#btnCompleteSignup')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const fields = {
        business_name: document.querySelector('#signup-name')?.value?.trim(),
        industry: document.querySelector('#signup-category')?.value?.trim() || null,
        country: document.querySelector('#signup-country')?.value?.trim() || null,
        city: document.querySelector('#signup-city')?.value?.trim() || null,
        short_description: document.querySelector('#signup-desc')?.value?.trim() || null,
        description: document.querySelector('#signup-desc')?.value?.trim() || null,
        whatsapp: document.querySelector('#signup-whatsapp')?.value?.trim() || null,
        // logo_url will be auto-filled from uploaded state if not provided
      };
      const row = await onCompleteSignup(fields);
      console.log('Business created:', row);
      // TODO: redirect to dashboard/profile
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not complete signup');
    }
  });
});