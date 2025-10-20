// Bulletin FAB (Floating Action Button) Handler
import { supabase } from '../js/supabase-client.js';
import { reloadBulletinFeed } from './list.js';

// global guard to block blue composer completely
window.DISABLE_BULLETIN_COMPOSER = true;

/**
 * Upload file to storage and get public URL
 * @param {File} file - File to upload
 * @returns {Promise<string|null>} Public URL or null
 */
async function uploadAndGetUrl(file) {
  if (!file) return null;
  
  try {
    const path = `covers/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from('business-assets')
      .upload(path, file, { upsert: false });
    
    if (error) throw error;
    
    const { data } = supabase.storage.from('business-assets').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

let currentUser = null;
let userProfile = null;

// Initialize FAB on page load
document.addEventListener('DOMContentLoaded', async () => {
  // guard so we attach once
  if (!window._fabWired) {
    window._fabWired = true;
    await initializeFAB();
  }
});

async function initializeFAB() {
  const fab = document.querySelector('#fabAddBulletin'); // your + button
  const modal = document.getElementById('bulletinModal'); // BLACK modal only

  if (!fab || !modal) {
    console.warn('FAB button or modal not found - this page may not need the FAB functionality');
    return;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  if (user) {
    // Load user profile to check role
    await loadUserProfile();
  }

  // OPEN: only open the black modal
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBulletinModal();
  });

  // CLOSE X: prevent any other handlers from running
  modal.addEventListener('click', (e) => {
    const x = e.target.closest('.modal-close, .close, .close-bulletin, #bClose, #bCancel');
    if (x) {
      e.preventDefault();
      e.stopPropagation();
      closeBulletinModal();
    }
  });

  // Setup form handlers
  setupComposerHandlers(modal);
  
  console.log('FAB initialized with black modal only');
}

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', currentUser.id)
      .single();

    if (error) {
      console.error('Error loading business profile:', error);
      return;
    }

    userProfile = data;
  } catch (error) {
    console.error('Error in loadUserProfile:', error);
  }
}

function openBulletinModal() {
  const modal = document.getElementById('bulletinModal');
  if (!modal) {
    console.error('Bulletin modal not found');
    return;
  }
  
  // Ensure guest modal is closed first
  const guestModal = document.getElementById('guest-bulletin-modal');
  if (guestModal) {
    guestModal.style.display = 'none';
  }
  
  // Open the main bulletin modal
  modal.classList.add('show');
  modal.removeAttribute('hidden');
  console.log('Black modal opened - guest modal hidden');
}

function closeBulletinModal() {
  const modal = document.getElementById('bulletinModal');
  if (!modal) {
    console.error('Bulletin modal not found');
    return;
  }
  
  // Close the main bulletin modal
  modal.classList.remove('show');
  modal.setAttribute('hidden', '');
  
  // Ensure guest modal is also closed (prevent it from opening)
  const guestModal = document.getElementById('guest-bulletin-modal');
  if (guestModal) {
    guestModal.style.display = 'none';
  }
  
  console.log('Black modal closed - all modals hidden');
}

// OLD/LEGACY — removed handleFABClick function, now using direct openBulletinModal()

// Removed isProvider function - no longer needed

function showAuthRequiredDialog(modal) {
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Sign in required</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="auth-dialog">
        <h3>Please log in or create an account to post a bulletin</h3>
        <p>You need to be signed in to create and share bulletins with the community.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="goToLogin()">Log In</button>
          <button class="btn btn-secondary" onclick="goToSignup()">Sign Up</button>
          <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

function showLoginDialog(modal) {
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Sign In Required</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="auth-dialog">
        <h3>Please sign in to post a bulletin</h3>
        <p>You need to be signed in to create and share bulletins with the community.</p>
        <button class="btn btn-primary" onclick="goToLogin()">Login</button>
        <button class="btn btn-secondary" onclick="goToSignup()">Sign Up</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

function showUpgradeDialog(modal) {
  // Hide "Become a Provider" dialog on bulletin page
  const onBulletinPage = location.pathname.endsWith('/bulletin.html');
  if (onBulletinPage) {
    // Never show provider upgrade gate on bulletin page
    // Show auth required dialog instead
    showAuthRequiredDialog(modal);
    return;
  }
  
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Business Account Required</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="auth-dialog">
        <h3>Only business owners can post bulletins</h3>
        <p>Create a business account to share opportunities, job postings, and announcements with the community.</p>
        <button class="btn btn-primary" onclick="goToProvider()">Create Business Account</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

async function showComposerModal(modal) {
  console.log('Showing composer modal...');
  console.log('Modal element:', modal);
  
  // Simply show the existing modal (no fetch needed)
  openBulletinModal();
  
  console.log('Modal should now be visible');
  
  // Setup form handlers
  setupComposerHandlers(modal);
}

function setupComposerHandlers(modal) {
  // Character counter for description
  const descTextarea = modal.querySelector('#bDesc');
  const descCount = modal.querySelector('#descCount');
  
  if (descTextarea && descCount) {
    descTextarea.addEventListener('input', () => {
      descCount.textContent = descTextarea.value.length;
    });
  }

  // Close button (X in header)
  const closeBtn = modal.querySelector('#bClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBulletinModal);
  }

  // Cancel button
  const cancelBtn = modal.querySelector('#bCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBulletinModal);
  }

  // Draft button
  const draftBtn = modal.querySelector('#bDraft');
  if (draftBtn) {
    draftBtn.addEventListener('click', () => handleSubmit('draft'));
  }

  // Publish button
  const publishBtn = modal.querySelector('#bPublish');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => handleSubmit('published'));
  }
}

async function handleSubmit(status) {
  const form = document.getElementById('bulletinForm');
  if (!form) {
    console.error('Form not found');
    return;
  }

  const formData = new FormData(form);
  
  // Validate required fields
  const type = formData.get('type');
  const title = formData.get('title')?.trim();
  const description = formData.get('description')?.trim();

  if (!type || !title || !description) {
    alert('Please fill in all required fields (Type, Title, Description)');
    return;
  }

  // Show loading state
  const submitBtn = status === 'published' ? 
    document.querySelector('#bPublish') : 
    document.querySelector('#bDraft');
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
  }

  try {
    // Get current session and user ID for created_by field
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    // Try to get business ID (optional - not required for bulletins)
    let businessId = null;
    try {
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', currentUser.id)
        .single();
      
      if (!bizError && business) {
        businessId = business.id;
      }
    } catch (bizError) {
      console.log('No business account found - proceeding without business_id');
    }

    // Prepare bulletin data
    const bulletinData = {
      type: 'bulletin',
      title: title,
      description: description,
      location: null,
      start_at: new Date().toISOString(),
      end_at: formData.get('deadline') || null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      link: null,
      status: status,
      is_published: status === 'published',
      cover_image_url: null,
      business_id: businessId, // null is allowed
      created_by: uid // 🔑 owner field required
    };

    // Handle file upload if provided
    const file = formData.get('attachment');
    if (file && file.size > 0) {
      bulletinData.cover_image_url = await uploadAndGetUrl(file);
    }

    // Insert bulletin
    const { data, error } = await supabase
      .from('activities_base')
      .insert([bulletinData])
      .select()
      .single();

    if (error) throw error;

    // Success
    const message = status === 'published' ? 'Bulletin published!' : 'Draft saved.';
    alert(message);
    
    // Close modal
    closeBulletinModal();
    
    // Refresh bulletin list
    try {
      await reloadBulletinFeed();
    } catch (refreshError) {
      console.error('Error refreshing feed:', refreshError);
    }

  } catch (error) {
    console.error('Error saving bulletin:', error);
    alert('Failed to save bulletin. Please try again.');
  } finally {
    // Restore button state
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = status === 'published' ? 'Publish' : 'Save Draft';
    }
  }
}

function closeModal() {
  // Legacy function - now just calls closeBulletinModal
  closeBulletinModal();
}

// Global functions for dialog buttons
window.goToLogin = () => {
  window.location.href = '/auth.html#login';
};

window.goToSignup = () => {
  window.location.href = '/auth.html#signup';
};

window.goToProvider = () => {
  window.location.href = '/account-business.html';
};

window.closeModal = closeModal;