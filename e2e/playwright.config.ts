import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.e2e' });

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 60_000,
  retries: 0,
  workers: 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { 
      name: 'chromium', 
      use: { ...devices['Desktop Chrome'] } 
    },
    { 
      name: 'webkit', 
      use: { ...devices['Desktop Safari'] } 
    },
    { 
      name: 'mobile-chrome', 
      use: { ...devices['Pixel 5'] } 
    },
    { 
      name: 'mobile-safari', 
      use: { ...devices['iPhone 12'] } 
    },
  ],
});
