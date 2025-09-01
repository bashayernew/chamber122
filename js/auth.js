// Auth handlers using supabaseClient if configured

const sessionBox = document.getElementById('session-box');
const logoutBtn = document.getElementById('logout-btn');

function setNote(text) {
  if (sessionBox) {
    const noteDiv = sessionBox.querySelector('div');
    if (noteDiv) noteDiv.textContent = text;
  }
}

async function refreshSessionUI() {
  if (!window.SUPABASE_ENABLED || !window.supabaseClient) {
    setNote('Supabase not configured. Create js/config.js.');
    return;
  }
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session) {
    setNote(`Logged in as ${session.user.email}`);
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    setNote('Not logged in.');
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

async function signIn(email, password) {
  const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signUp(email, password) {
  const { error } = await window.supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
}

// Bind forms
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.SUPABASE_ENABLED) return alert('Supabase not configured');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    try {
      await signIn(email, password);
      alert('Logged in');
      refreshSessionUI();
    } catch (err) {
      alert(err.message);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.SUPABASE_ENABLED) return alert('Supabase not configured');
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    try {
      await signUp(email, password);
      alert('Account created. Check your email to verify.');
      refreshSessionUI();
    } catch (err) {
      alert(err.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (!window.SUPABASE_ENABLED) return;
    await window.supabaseClient.auth.signOut();
    refreshSessionUI();
  });
}

refreshSessionUI();


