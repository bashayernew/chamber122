/**
 * Auth Signup Flow E2E Tests
 * Tests the complete signup process with sticky tabs and file uploads
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsMSME, logout } from '../fixtures/auth';

test.describe('Auth Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page with signup hash
    await page.goto('/auth.html#signup');
  });

  test('should display sticky tabs and signup panel', async ({ page }) => {
    // Check that sticky tabs are visible
    await expect(page.getByTestId('auth-tabs')).toBeVisible();
    await expect(page.getByTestId('tab-login')).toBeVisible();
    await expect(page.getByTestId('tab-signup')).toBeVisible();
    
    // Check that signup tab is active
    await expect(page.getByTestId('tab-signup')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('tab-login')).toHaveAttribute('aria-selected', 'false');
    
    // Check that signup panel is visible
    await expect(page.getByTestId('panel-signup')).toBeVisible();
    await expect(page.getByTestId('panel-login')).not.toBeVisible();
  });

  test('should switch between tabs when clicked', async ({ page }) => {
    // Click login tab
    await page.getByTestId('tab-login').click();
    
    // Check that login tab is active
    await expect(page.getByTestId('tab-login')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('tab-signup')).toHaveAttribute('aria-selected', 'false');
    
    // Check that login panel is visible
    await expect(page.getByTestId('panel-login')).toBeVisible();
    await expect(page.getByTestId('panel-signup')).not.toBeVisible();
    
    // Click signup tab
    await page.getByTestId('tab-signup').click();
    
    // Check that signup tab is active again
    await expect(page.getByTestId('tab-signup')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('tab-login')).toHaveAttribute('aria-selected', 'false');
    
    // Check that signup panel is visible
    await expect(page.getByTestId('panel-signup')).toBeVisible();
    await expect(page.getByTestId('panel-login')).not.toBeVisible();
  });

  test('should show step indicators and progress bar', async ({ page }) => {
    // Check step indicators
    const stepIndicators = page.locator('.step-indicator');
    await expect(stepIndicators).toHaveCount(4);
    
    // Check that first step is active
    await expect(stepIndicators.nth(0)).toHaveClass(/active/);
    
    // Check progress bar
    const progressBar = page.locator('#signup-progress');
    await expect(progressBar).toBeVisible();
  });

  test('should validate step 1 fields', async ({ page }) => {
    // Try to proceed without filling fields
    await page.getByTestId('signup-next-1').click();
    
    // Check that we're still on step 1
    await expect(page.locator('#signup-step-1')).toBeVisible();
    
    // Fill invalid email
    await page.getByTestId('signup-email').fill('invalid-email');
    await page.getByTestId('signup-next-1').click();
    
    // Should show error
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Fill valid email but short password
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('123');
    await page.getByTestId('signup-next-1').click();
    
    // Should show password error
    await expect(page.locator('.error-message')).toContainText('Password must be at least 8 characters');
    
    // Fill valid password but no confirmation
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('different123');
    await page.getByTestId('signup-next-1').click();
    
    // Should show password match error
    await expect(page.locator('.error-message')).toContainText('Passwords do not match');
    
    // Fill valid confirmation but no terms
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-next-1').click();
    
    // Should show terms error
    await expect(page.locator('.error-message')).toContainText('You must accept the terms and conditions');
  });

  test('should proceed to step 2 with valid step 1 data', async ({ page }) => {
    // Fill valid step 1 data
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    
    // Click next
    await page.getByTestId('signup-next-1').click();
    
    // Should proceed to step 2
    await expect(page.locator('#signup-step-2')).toBeVisible();
    await expect(page.locator('#signup-step-1')).not.toBeVisible();
    
    // Check that step 2 indicator is active
    const stepIndicators = page.locator('.step-indicator');
    await expect(stepIndicators.nth(1)).toHaveClass(/active/);
    await expect(stepIndicators.nth(0)).toHaveClass(/completed/);
  });

  test('should validate step 2 required fields', async ({ page }) => {
    // Fill step 1 and proceed
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-next-1').click();
    
    // Try to proceed without filling required fields
    await page.getByTestId('signup-next-2').click();
    
    // Should show validation errors
    await expect(page.locator('.error-message')).toContainText('Business name is required');
    await expect(page.locator('.error-message')).toContainText('Category is required');
    await expect(page.locator('.error-message')).toContainText('Country is required');
    await expect(page.locator('.error-message')).toContainText('City is required');
    await expect(page.locator('.error-message')).toContainText('Description is required');
    await expect(page.locator('.error-message')).toContainText('WhatsApp/Phone is required');
  });

  test('should validate description character count', async ({ page }) => {
    // Fill step 1 and proceed
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-next-1').click();
    
    // Fill other required fields
    await page.getByTestId('signup-name').fill('Test Business');
    await page.getByTestId('signup-category').selectOption('tech');
    await page.getByTestId('signup-country').selectOption('Kuwait');
    await page.getByTestId('signup-city').fill('Kuwait City');
    await page.getByTestId('signup-whatsapp').fill('+965-12345678');
    
    // Fill short description
    await page.getByTestId('signup-desc').fill('Short');
    await page.getByTestId('signup-next-2').click();
    
    // Should show description length error
    await expect(page.locator('.error-message')).toContainText('Description is required (minimum 50 characters)');
    
    // Check character counter
    const counter = page.locator('#desc-counter');
    await expect(counter).toContainText('5/140');
    
    // Fill valid description
    await page.getByTestId('signup-desc').fill('This is a valid business description that meets the minimum character requirement of 50 characters.');
    await expect(counter).toContainText('100/140');
    
    // Should proceed to step 3
    await page.getByTestId('signup-next-2').click();
    await expect(page.locator('#signup-step-3')).toBeVisible();
  });

  test('should handle file uploads', async ({ page }) => {
    // Fill steps 1-2 and proceed
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-next-1').click();
    
    await page.getByTestId('signup-name').fill('Test Business');
    await page.getByTestId('signup-category').selectOption('tech');
    await page.getByTestId('signup-country').selectOption('Kuwait');
    await page.getByTestId('signup-city').fill('Kuwait City');
    await page.getByTestId('signup-desc').fill('This is a valid business description that meets the minimum character requirement of 50 characters.');
    await page.getByTestId('signup-whatsapp').fill('+965-12345678');
    await page.getByTestId('signup-next-2').click();
    
    // Upload a logo file
    const fileInput = page.getByTestId('signup-logo');
    await fileInput.setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data')
    });
    
    // Check that file upload label shows file selected
    await expect(page.locator('.file-upload-label')).toHaveClass(/has-file/);
  });

  test('should complete full signup flow', async ({ page }) => {
    // Fill step 1
    await page.getByTestId('signup-email').fill('newuser@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-next-1').click();
    
    // Fill step 2
    await page.getByTestId('signup-name').fill('New Test Business');
    await page.getByTestId('signup-category').selectOption('tech');
    await page.getByTestId('signup-country').selectOption('Kuwait');
    await page.getByTestId('signup-city').fill('Kuwait City');
    await page.getByTestId('signup-desc').fill('This is a valid business description that meets the minimum character requirement of 50 characters.');
    await page.getByTestId('signup-whatsapp').fill('+965-12345678');
    await page.getByTestId('signup-next-2').click();
    
    // Fill step 3 (optional)
    await page.getByTestId('signup-reg-type').selectOption('unregistered');
    await page.getByTestId('signup-next-3').click();
    
    // Fill step 4
    await page.getByTestId('signup-confirm-info').check();
    
    // Submit the form
    await page.getByTestId('signup-submit').click();
    
    // Should redirect to owner activities page
    await expect(page).toHaveURL(/owner-activities\.html/);
    await expect(page).toHaveURL(/needs=approval/);
  });

  test('should handle back button functionality', async ({ page }) => {
    // Fill step 1 and proceed
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-confirm').fill('password123');
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-next-1').click();
    
    // Fill step 2 and proceed
    await page.getByTestId('signup-name').fill('Test Business');
    await page.getByTestId('signup-category').selectOption('tech');
    await page.getByTestId('signup-country').selectOption('Kuwait');
    await page.getByTestId('signup-city').fill('Kuwait City');
    await page.getByTestId('signup-desc').fill('This is a valid business description that meets the minimum character requirement of 50 characters.');
    await page.getByTestId('signup-whatsapp').fill('+965-12345678');
    await page.getByTestId('signup-next-2').click();
    
    // Go back to step 2
    await page.getByTestId('signup-back').click();
    await expect(page.locator('#signup-step-2')).toBeVisible();
    await expect(page.locator('#signup-step-3')).not.toBeVisible();
    
    // Go back to step 1
    await page.getByTestId('signup-back').click();
    await expect(page.locator('#signup-step-1')).toBeVisible();
    await expect(page.locator('#signup-step-2')).not.toBeVisible();
  });

  test('should handle URL hash routing', async ({ page }) => {
    // Navigate to login hash
    await page.goto('/auth.html#login');
    
    // Should show login tab active
    await expect(page.getByTestId('tab-login')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-login')).toBeVisible();
    
    // Navigate to signup hash
    await page.goto('/auth.html#signup');
    
    // Should show signup tab active
    await expect(page.getByTestId('tab-signup')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-signup')).toBeVisible();
  });

  test('should test sticky behavior when scrolling', async ({ page }) => {
    // Add some content to make the page scrollable
    await page.addStyleTag({
      content: `
        .auth-card { height: 200vh; }
        .signup-step { min-height: 100vh; }
      `
    });
    
    // Check that tabs are initially visible
    await expect(page.getByTestId('auth-tabs')).toBeVisible();
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Check that tabs are still visible (sticky)
    await expect(page.getByTestId('auth-tabs')).toBeVisible();
  });
});

test.describe('Auth Signup Flow - RTL Support', () => {
  test.beforeEach(async ({ page }) => {
    // Switch to Arabic
    await page.goto('/auth.html#signup');
    await page.getByTestId('lang-switch-ar').click();
  });

  test('should display Arabic translations', async ({ page }) => {
    // Check Arabic text
    await expect(page.getByTestId('tab-login')).toContainText('تسجيل الدخول');
    await expect(page.getByTestId('tab-signup')).toContainText('إنشاء حساب وإدراج منشأتي');
    
    // Check step titles in Arabic
    await expect(page.locator('#signup-step-1 .step-title')).toContainText('إنشاء حسابك');
    await expect(page.locator('#signup-step-1 .step-subtitle')).toContainText('ابدأ بإنشاء بيانات اعتماد حسابك');
  });

  test('should apply RTL layout', async ({ page }) => {
    // Check that RTL is applied
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });
});
