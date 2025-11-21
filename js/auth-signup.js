// js/auth-signup.js - Simplified signup handler
import { createBusiness } from './businesses.api.js';

console.log('[auth-signup] Module loaded');

// Helper to wait for Supabase to be ready
async function waitForSupabase() {
  if (window.__supabase || window.__supabaseClient) {
    return window.__supabase || window.__supabaseClient;
  }
  
  // Wait for initialization
  await new Promise(r => {
    const i = setInterval(() => {
      if (window.__supabase || window.__supabaseClient) {
        clearInterval(i);
        r();
      }
    }, 50);
  });
  
  return window.__supabase || window.__supabaseClient;
}

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
    
    const supabase = await waitForSupabase();
    if (!supabase) {
      console.error('[auth-signup] Supabase not ready');
      alert('System not ready. Please refresh the page.');
      return;
    }

    const email = form.querySelector('#signup-email')?.value?.trim();
    const password = form.querySelector('#signup-password')?.value;

    if (!email || !password) {
      alert('Email and password are required');
      return;
    }

    // Collect all business fields
    const fields = {
      business_name: form.querySelector('#signup-name')?.value?.trim() || null,
      description: form.querySelector('#signup-desc')?.value?.trim() || null,
      story: form.querySelector('#signup-story')?.value?.trim() || null,
      city: form.querySelector('#signup-city')?.value?.trim() || null,
      area: form.querySelector('#signup-area')?.value?.trim() || null,
      block: form.querySelector('#signup-block')?.value?.trim() || null,
      street: form.querySelector('#signup-street')?.value?.trim() || null,
      floor: form.querySelector('#signup-floor')?.value?.trim() || null,
      office_no: form.querySelector('#signup-office-no')?.value?.trim() || null,
      industry: form.querySelector('#signup-category')?.value?.trim() || 'general',
      phone: form.querySelector('#signup-phone')?.value?.trim() || null,
      whatsapp: form.querySelector('#signup-whatsapp')?.value?.trim() || null,
      website: form.querySelector('#signup-website')?.value?.trim() || null,
      instagram: form.querySelector('#signup-instagram')?.value?.trim() || null,
    };

    console.log('[auth-signup] Collected fields:', fields);

    // 1) Sign up user
    const { data: signedUp, error: signErr } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (signErr) {
      console.error('[auth-signup] signUp error:', signErr);
      alert('Sign up failed: ' + signErr.message);
      return;
    }

    const userId = signedUp.user?.id;
    if (!userId) {
      console.error('[auth-signup] No user ID returned');
      alert('Sign up failed: No user ID received');
      return;
    }

    console.log('[auth-signup] Signed up user:', userId);

    // 2) Create business row connected to this user
    try {
      const payload = {
        owner_id: userId,
        name: fields.business_name || 'My Business',
        description: fields.description || null,
        story: fields.story || null,
        country: 'Kuwait',
        city: fields.city || null,
        area: fields.area || null,
        block: fields.block || null,
        street: fields.street || null,
        floor: fields.floor || null,
        office_no: fields.office_no || null,
        industry: fields.industry || 'general',
        category: fields.industry || 'general',
        phone: fields.phone || null,
        whatsapp: fields.whatsapp || null,
        website: fields.website || null,
        instagram: fields.instagram || null,
        logo_url: null,
        is_active: true
      };

      const created = await createBusiness(payload);
      console.log('[auth-signup] Business created:', created);
      
      // 3) Redirect to owner page
      alert('Account created successfully! Redirecting to your profile...');
      window.location.href = '/owner.html?businessId=' + created.id;
    } catch (e2) {
      console.error('[auth-signup] createBusiness error:', e2);
      alert('Could not create your business profile: ' + (e2.message || e2));
    }
  });
});


    if (signErr) {
      console.error('[auth-signup] signUp error:', signErr);
      alert('Sign up failed: ' + signErr.message);
      return;
    }

    const userId = signedUp.user?.id;
    if (!userId) {
      console.error('[auth-signup] No user ID returned');
      alert('Sign up failed: No user ID received');
      return;
    }

    console.log('[auth-signup] Signed up user:', userId);

    // 2) Create business row connected to this user
    try {
      const payload = {
        owner_id: userId,
        name: fields.business_name || 'My Business',
        description: fields.description || null,
        story: fields.story || null,
        country: 'Kuwait',
        city: fields.city || null,
        area: fields.area || null,
        block: fields.block || null,
        street: fields.street || null,
        floor: fields.floor || null,
        office_no: fields.office_no || null,
        industry: fields.industry || 'general',
        category: fields.industry || 'general',
        phone: fields.phone || null,
        whatsapp: fields.whatsapp || null,
        website: fields.website || null,
        instagram: fields.instagram || null,
        logo_url: null,
        is_active: true
      };

      const created = await createBusiness(payload);
      console.log('[auth-signup] Business created:', created);
      
      // 3) Redirect to owner page
      alert('Account created successfully! Redirecting to your profile...');
      window.location.href = '/owner.html?businessId=' + created.id;
    } catch (e2) {
      console.error('[auth-signup] createBusiness error:', e2);
      alert('Could not create your business profile: ' + (e2.message || e2));
    }
  });
});
