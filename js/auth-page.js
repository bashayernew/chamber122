import { sb, getSessionUser } from "./supabase.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const statusEl = document.getElementById("status");
const btnIn = document.getElementById("signin");
const btnUp = document.getElementById("signup");
const btnOut = document.getElementById("signout");

async function refresh(){
  const user = await getSessionUser();
  if (user){ 
    statusEl.textContent = `Logged in as ${user.email}`; 
    btnOut.style.display = "inline-block"; 
  }
  else { 
    statusEl.textContent = "Not logged in"; 
    btnOut.style.display = "none"; 
  }
}

refresh();

btnIn?.addEventListener("click", async () => {
  const { error } = await sb().auth.signInWithPassword({ email: emailEl.value, password: passEl.value });
  if (error) {
    statusEl.textContent = error.message;
  } else {
    statusEl.textContent = "Signed in successfully! Redirecting...";
    // Redirect to owner activities dashboard
    setTimeout(() => {
      window.location.href = '/owner-activities.html';
    }, 1000);
  }
  refresh();
});

btnUp?.addEventListener("click", async () => {
  const { error } = await sb().auth.signUp({ email: emailEl.value, password: passEl.value });
  statusEl.textContent = error ? error.message : "Check your email to confirm."; 
  refresh();
});

btnOut?.addEventListener("click", async () => { 
  await sb().auth.signOut(); 
  statusEl.textContent = "Signed out."; 
  refresh(); 
});

