/**
 * Development Configuration
 * 
 * TODO: Re-enable email confirmation in production
 * To re-enable: Set BYPASS_EMAIL_CONFIRMATION = false
 */

export const DEV_CONFIG = {
  // Set to false to re-enable email confirmation in production
  BYPASS_EMAIL_CONFIRMATION: true,
  
  // Development mode indicator
  IS_DEVELOPMENT: true,
  
  // Auto-redirect after successful auth
  AUTO_REDIRECT: true,
  
  // Show development messages
  SHOW_DEV_MESSAGES: true
};

// Helper function to check if email confirmation is bypassed
export function isEmailConfirmationBypassed() {
  return DEV_CONFIG.BYPASS_EMAIL_CONFIRMATION;
}

// Helper function to check if we're in development mode
export function isDevelopmentMode() {
  return DEV_CONFIG.IS_DEVELOPMENT;
}

// Debug function to log current configuration
export function logConfig() {
  console.log('DEV CONFIG:', DEV_CONFIG);
  console.log('Email confirmation bypassed:', isEmailConfirmationBypassed());
  console.log('Development mode:', isDevelopmentMode());
}
