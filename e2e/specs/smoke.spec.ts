// Smoke tests - basic functionality and language switching
import { test, expect } from '@playwright/test';
import { logout, setLang } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await page.goto('/');
});

test('Site loads without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check for critical console errors (allow some warnings)
  const criticalErrors = consoleErrors.filter(error => 
    !error.includes('favicon') && 
    !error.includes('404') &&
    !error.includes('CORS')
  );
  
  expect(criticalErrors).toHaveLength(0);
});

test('Language toggle EN → AR works', async ({ page }) => {
  await page.goto('/');
  
  // Start with English
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  
  // Switch to Arabic
  await setLang(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  
  // Switch back to English
  await setLang(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Navigation elements are visible', async ({ page }) => {
  await page.goto('/');
  
  // Check main navigation
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /directory/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /events/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /bulletin/i })).toBeVisible();
  
  // Check language switcher
  await expect(page.getByTestId('lang-switch-en')).toBeVisible();
  await expect(page.getByTestId('lang-switch-ar')).toBeVisible();
});

test('Basic page structure intact', async ({ page }) => {
  await page.goto('/');
  
  // Check main sections exist
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  
  // Check for key content areas
  await expect(page.locator('.hero-section')).toBeVisible();
  await expect(page.locator('.featured-section')).toBeVisible();
});

test('All main pages load', async ({ page }) => {
  const pages = ['/', '/directory.html', '/events.html', '/bulletin.html', '/about.html', '/contact.html'];
  
  for (const pagePath of pages) {
    await page.goto(pagePath);
    await page.waitForLoadState('networkidle');
    
    // Check page loaded successfully (not 404)
    expect(page.url()).toContain(pagePath);
    
    // Check basic structure
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  }
});
