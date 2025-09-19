/**
 * Guest session management using localStorage
 * Provides lightweight guest mode for unauthenticated users
 */

const GUEST_KEY = "ch122_guest_email";

/**
 * Get the current guest email from localStorage
 * @returns {string} Guest email or empty string
 */
export function getGuestEmail() {
  try {
    return localStorage.getItem(GUEST_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Check if a guest session is currently active
 * @returns {boolean} True if guest email exists
 */
export function isGuestActive() {
  return !!getGuestEmail();
}

/**
 * Start a guest session with the provided email
 * @param {string} email - Valid email address
 * @throws {Error} If email is invalid
 */
export function startGuest(email) {
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Valid email required");
  }
  localStorage.setItem(GUEST_KEY, email.trim());
}

/**
 * End the current guest session
 */
export function endGuest() {
  localStorage.removeItem(GUEST_KEY);
}

/**
 * Get guest session info
 * @returns {Object} Guest session data
 */
export function getGuestInfo() {
  const email = getGuestEmail();
  return {
    email,
    isActive: !!email,
    timestamp: email ? Date.now() : null
  };
}