import { supabase } from "./supabase-client.js";
import { getCurrentUser } from "./auth-state-manager.js";

/** Replace with your modal. For now, a simple prompt. */
async function promptEmail() {
  const email = window.prompt("Enter your email to continue:");
  return email && email.trim() ? email.trim() : null;
}

export async function ensureSignedIn() {
  const existing = getCurrentUser();
  if (existing) return existing;

  const email = await promptEmail();
  if (!email) return null;

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) { console.error(error); alert(error.message); return null; }
  alert("We sent you a login link / OTP. After completing it, this page will continue.");

  // Wait for session
  return new Promise((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const user = session?.user ?? null;
      if (user) {
        sub.subscription.unsubscribe();
        resolve(user);
      }
    });
  });
}