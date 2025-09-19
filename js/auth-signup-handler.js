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
    window.location.href = '/owner-activities.html';
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
    name: document.getElementById('signup-name')?.value?.trim(),
    category: document.getElementById('signup-category')?.value,
    country: document.getElementById('signup-country')?.value,
    city: document.getElementById('signup-city')?.value?.trim(),
    description: document.getElementById('signup-desc')?.value?.trim(),
    whatsapp: document.getElementById('signup-whatsapp')?.value?.trim(),
    email: document.getElementById('signup-email')?.value?.trim(),
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
    
    // Complete the business signup
    const business = await onCompleteSignup({
      ...formData,
      owner_id: user.id,
      email: user.email
    });
    
    // Show success message
    alert('Account created successfully! Welcome to Chamber122.');
    
    // Redirect to owner activities
    window.location.href = '/owner-activities.html';
    
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
