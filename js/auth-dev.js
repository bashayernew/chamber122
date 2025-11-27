/**
 * Development Authentication Module
 * Backend API version - no email confirmation needed
 */

/**
 * Check if email confirmation is bypassed
 * Always returns true since backend API doesn't require email confirmation
 */
export function isEmailConfirmationBypassed() {
  return true; // Backend API doesn't require email confirmation
}
