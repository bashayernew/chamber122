// Environment configuration for E2E tests
import * as dotenv from 'dotenv';

// Load environment variables from .env.e2e
dotenv.config({ path: '.env.e2e' });

export const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE!,
  },
  users: {
    admin: {
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
    },
    msmePending: {
      email: process.env.MSME_PENDING_EMAIL!,
      password: process.env.MSME_PENDING_PASSWORD!,
    },
    msmeApproved: {
      email: process.env.MSME_APPROVED_EMAIL!,
      password: process.env.MSME_APPROVED_PASSWORD!,
    },
    guest: {
      email: process.env.GUEST_EMAIL!,
    },
  },
  testData: {
    marker: process.env.TEST_DATA_MARKER || 'ch122_e2e_test',
  },
};

// Validate required environment variables
export function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'MSME_PENDING_EMAIL',
    'MSME_PENDING_PASSWORD',
    'MSME_APPROVED_EMAIL',
    'MSME_APPROVED_PASSWORD',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
