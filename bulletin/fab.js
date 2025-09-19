// Bulletin FAB (Floating Action Button) Handler
import { supabase } from '/js/supabase-client.js';
import { reloadBulletinFeed } from './list.js';

let currentUser = null;
let userProfile = null;

// Initialize FAB on page load
document.addEventListener('DOMContentLoaded', async () => {
  await initializeFAB();
});

async function initializeFAB() {
  const fab = document.getElementById('fabAddBulletin');
  if (!fab) {
    console.warn('FAB button not found - this page may not need the FAB functionality');
    return;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  if (user) {
    // Load user profile to check role
    await loadUserProfile();
  }

  // Add click handler
  fab.addEventListener('click', handleFABClick);
  console.log('FAB initialized');
}

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      console.error('Error loading user profile:', error);
      return;
    }

    userProfile = data;
  } catch (error) {
    console.error('Error in loadUserProfile:', error);
  }
}

async function handleFABClick(e) {
  e.preventDefault();
  console.log('FAB clicked');

  const modal = document.getElementById('bulletinModal');
  if (!modal) {
    console.error('bulletinModal not found, redirecting to owner-bulletins.html');
    window.location.href = '/owner-bulletins.html';
    return;
  }

  // Check user status and show appropriate dialog
  if (!currentUser) {
    showLoginDialog(modal);
  } else if (!isProvider(userProfile?.role)) {
    showUpgradeDialog(modal);
  } else {
    showComposerModal(modal);
  }
}

function isProvider(role) {
  return role === 'provider_individual' || role === 'provider_company';
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
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Upgrade Required</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="auth-dialog">
        <h3>Only providers can post bulletins</h3>
        <p>Become a provider to share opportunities, job postings, and announcements with the community.</p>
        <button class="btn btn-primary" onclick="goToProvider()">Become a Provider</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

async function showComposerModal(modal) {
  try {
    // Load composer HTML
    const response = await fetch('/bulletin/components/bulletin-composer.html');
    if (!response.ok) {
      throw new Error('Failed to load composer');
    }
    
    const composerHtml = await response.text();
    modal.innerHTML = composerHtml;
    modal.classList.add('show');
    
    // Setup form handlers
    setupComposerHandlers(modal);
    
  } catch (error) {
    console.error('Error loading composer:', error);
    // Fallback: redirect to owner-bulletins.html
    window.location.href = '/owner-bulletins.html';
  }
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

  // Cancel button
  const cancelBtn = modal.querySelector('#bCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
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
    // Prepare bulletin data
    const bulletinData = {
      owner_user_id: currentUser.id,
      type: type,
      title: title,
      description: description,
      location: formData.get('location')?.trim() || null,
      deadline: formData.get('deadline') || null,
      status: status,
      created_at: new Date().toISOString()
    };

    // Handle file upload if provided
    const file = formData.get('attachment');
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/bulletin-${crypto.randomUUID()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bulletin-attachments')
        .upload(fileName, file, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      bulletinData.attachment_path = fileName;
    }

    // Insert bulletin
    const { data, error } = await supabase
      .from('bulletins')
      .insert([bulletinData])
      .select()
      .single();

    if (error) throw error;

    // Success
    const message = status === 'published' ? 'Bulletin published!' : 'Draft saved.';
    alert(message);
    
    // Close modal
    closeModal();
    
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
  const modal = document.getElementById('bulletinModal');
  if (modal) {
    modal.classList.remove('show');
    modal.innerHTML = '';
  }
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