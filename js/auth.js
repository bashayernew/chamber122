// Auth handlers using supabase if configured
import { supabase } from './supabase-client.js';

const sessionBox = document.getElementById('session-box');
const logoutBtn = document.getElementById('logout-btn');

function setNote(text) {
  if (sessionBox) {
    const noteDiv = sessionBox.querySelector('div');
    if (noteDiv) noteDiv.textContent = text;
  }
}

async function refreshSessionUI() {
  if (!SUPABASE_ENABLED || !supabase) {
    setNote('Supabase not configured. Create js/config.js.');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    setNote(`Logged in as ${session.user.email}`);
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    setNote('Not logged in.');
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

// Wait for DOM to be ready before binding forms
document.addEventListener('DOMContentLoaded', () => {
  // Bind forms
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    console.log('Login form found, binding event listener');
    loginForm.addEventListener('submit', async (e) => {
      console.log('Login form submitted');
      e.preventDefault();
      if (!SUPABASE_ENABLED) {
        console.log('Supabase not enabled');
        return alert('Supabase not configured');
      }
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      console.log('Attempting login with email:', email);
      try {
        await signIn(email, password);
        alert('Logged in');
        refreshSessionUI();
        // Handle redirect after successful login
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect') || '/';
        setTimeout(() => {
          location.href = redirect;
        }, 1000);
      } catch (err) {
        console.error('Login error:', err);
        alert(err.message);
      }
    });
  } else {
    console.log('Login form not found');
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!SUPABASE_ENABLED) return alert('Supabase not configured');
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      try {
        await signUp(email, password);
        alert('Account created. Check your email to verify.');
        refreshSessionUI();
        // Handle redirect after successful signup
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect') || '/';
        setTimeout(() => {
          location.href = redirect;
        }, 1000);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!SUPABASE_ENABLED) return;
      await supabase.auth.signOut();
      refreshSessionUI();
    });
  }

  refreshSessionUI();
});


