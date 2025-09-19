/**
 * Signup Flow E2E Tests
 * Tests the complete signup process from start to finish
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsMSME, logout } from '../fixtures/auth';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth.html');
  });

  test('should display login and signup tabs', async ({ page }) => {
    // Check that both tabs are visible
    await expect(page.getByTestId('login-tab')).toBeVisible();
    await expect(page.getByTestId('signup-tab')).toBeVisible();
    
    // Check that login tab is active by default
    await expect(page.getByTestId('login-tab')).toHaveClass(/active/);
    
    // Check that login form is visible
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('should switch to signup tab when clicked', async ({ page }) => {
    // Click signup tab
    await page.getByTestId('signup-tab').click();
    
    // Check that signup tab is active
    await expect(page.getByTestId('signup-tab')).toHaveClass(/active/);
    await expect(page.getByTestId('login-tab')).not.toHaveClass(/active/);
    
    // Check that signup form is visible
    await expect(page.getByTestId('signup-email')).toBeVisible();
    await expect(page.getByTestId('signup-password')).toBeVisible();
    await expect(page.getByTestId('signup-confirm')).toBeVisible();
    await expect(page.getByTestId('signup-terms')).toBeVisible();
  });

  test('should show step indicators and progress bar', async ({ page }) => {
    // Switch to signup tab
    await page.getByTestId('signup-tab').click();
    
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
    // Switch to signup tab
    await page.getByTestId('signup-tab').click();
    
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
    // Switch to signup tab
    await page.getByTestId('signup-tab').click();
    
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
    // Switch to signup tab and fill step 1
    await page.getByTestId('signup-tab').click();
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
    // Switch to signup tab and fill step 1
    await page.getByTestId('signup-tab').click();
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

  test('should handle logo upload', async ({ page }) => {
    // Switch to signup tab and fill steps 1-2
    await page.getByTestId('signup-tab').click();
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

  test('should proceed through all steps and create account', async ({ page }) => {
    // Switch to signup tab
    await page.getByTestId('signup-tab').click();
    
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

  test('should show back button functionality', async ({ page }) => {
    // Switch to signup tab and fill step 1
    await page.getByTestId('signup-tab').click();
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

  test('should handle login form submission', async ({ page }) => {
    // Fill login form with demo credentials
    await page.getByTestId('login-email').fill('approved@demo.com');
    await page.getByTestId('login-password').fill('Approved123!');
    
    // Submit login
    await page.getByTestId('login-submit').click();
    
    // Should redirect to owner activities
    await expect(page).toHaveURL(/owner-activities\.html/);
  });

  test('should show password toggle functionality', async ({ page }) => {
    // Test login password toggle
    await page.getByTestId('login-password').fill('password123');
    
    // Click toggle button
    const toggleButton = page.locator('.password-toggle').first();
    await toggleButton.click();
    
    // Password should be visible
    await expect(page.getByTestId('login-password')).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await toggleButton.click();
    await expect(page.getByTestId('login-password')).toHaveAttribute('type', 'password');
  });

  test('should handle URL hash routing', async ({ page }) => {
    // Navigate to signup hash
    await page.goto('/auth.html#signup');
    
    // Should show signup tab active
    await expect(page.getByTestId('signup-tab')).toHaveClass(/active/);
    await expect(page.locator('#signup-step-1')).toBeVisible();
    
    // Navigate to login hash
    await page.goto('/auth.html#login');
    
    // Should show login tab active
    await expect(page.getByTestId('login-tab')).toHaveClass(/active/);
    await expect(page.locator('#login-form')).toBeVisible();
  });
});

test.describe('Signup Flow - RTL Support', () => {
  test.beforeEach(async ({ page }) => {
    // Switch to Arabic
    await page.goto('/auth.html');
    await page.getByTestId('lang-switch-ar').click();
  });

  test('should display Arabic translations', async ({ page }) => {
    // Check Arabic text
    await expect(page.getByTestId('login-tab')).toContainText('تسجيل الدخول');
    await expect(page.getByTestId('signup-tab')).toContainText('إنشاء حساب وإدراج المشروع');
    
    // Switch to signup tab
    await page.getByTestId('signup-tab').click();
    
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
