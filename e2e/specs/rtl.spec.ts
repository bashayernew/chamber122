// RTL/Arabic specific tests
import { test, expect } from '@playwright/test';
import { logout, setLang } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await page.goto('/');
});

test('Arabic RTL layout and labels', async ({ page }) => {
  await setLang(page, 'ar');
  
  // Check HTML attributes
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  
  // Check navigation is RTL
  await expect(page.locator('nav')).toHaveCSS('direction', 'rtl');
  
  // Check language switcher
  await expect(page.getByTestId('lang-switch-ar')).toHaveClass(/active/);
  
  // Check Arabic labels
  await expect(page.getByRole('link', { name: /الرئيسية/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /الدليل/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /الفعاليات/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /النشرة/i })).toBeVisible();
});

test('Arabic numerals are displayed', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/events.html');
  
  // Check for Arabic numerals in time-ago text
  const timeAgoText = await page.getByText(/منذ/i).first().textContent();
  
  // Should contain Arabic numerals (٠١٢٣٤٥٦٧٨٩)
  const hasArabicNumerals = /[٠-٩]/.test(timeAgoText || '');
  expect(hasArabicNumerals).toBeTruthy();
});

test('Carousels swipe RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/');
  
  // Check featured carousel direction
  const carousel = page.locator('.featured-carousel');
  await expect(carousel).toHaveCSS('direction', 'rtl');
  
  // Check scroll behavior
  await expect(carousel).toHaveCSS('overflow-x', 'auto');
});

test('Forms display RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/auth.html');
  
  // Check form inputs are RTL
  await expect(page.getByTestId('email-input')).toHaveCSS('text-align', 'right');
  await expect(page.getByTestId('password-input')).toHaveCSS('text-align', 'right');
  
  // Check labels are RTL
  const labels = page.locator('label');
  for (let i = 0; i < await labels.count(); i++) {
    await expect(labels.nth(i)).toHaveCSS('text-align', 'right');
  }
});

test('Modals display RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/events.html');
  
  // Trigger auth modal
  await page.getByTestId('add-event-btn').click();
  
  // Check modal content is RTL
  await expect(page.getByTestId('auth-required-modal')).toHaveCSS('direction', 'rtl');
  
  // Check modal text alignment
  const modalContent = page.locator('.modal-content');
  await expect(modalContent).toHaveCSS('text-align', 'right');
});

test('Validation messages in Arabic', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/auth.html');
  
  // Try to submit empty form
  await page.getByTestId('sign-in-btn').click();
  
  // Should see Arabic validation messages
  await expect(page.getByText(/مطلوب|required/i)).toBeVisible();
});

test('Status badges display RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/owner-activities.html');
  
  // Check status badge direction
  const statusBadge = page.getByTestId('status-badge');
  if (await statusBadge.isVisible()) {
    await expect(statusBadge).toHaveCSS('flex-direction', 'row-reverse');
  }
});

test('Buttons maintain proper RTL layout', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/');
  
  // Check button text alignment
  const buttons = page.locator('.btn');
  for (let i = 0; i < await buttons.count(); i++) {
    const button = buttons.nth(i);
    // Buttons should be centered but icons should be RTL
    await expect(button).toHaveCSS('text-align', 'center');
  }
});

test('Footer displays RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/');
  
  // Check footer content is RTL
  await expect(page.locator('footer')).toHaveCSS('text-align', 'right');
  
  // Check footer links
  const footerLinks = page.locator('footer a');
  for (let i = 0; i < await footerLinks.count(); i++) {
    await expect(footerLinks.nth(i)).toHaveCSS('text-align', 'right');
  }
});

test('MSME overlay displays RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/directory.html');
  
  // Click on an MSME card
  await page.getByTestId('msme-card').first().click();
  
  // Check overlay is RTL
  await expect(page.getByTestId('msme-overlay')).toHaveCSS('direction', 'rtl');
  
  // Check overlay content alignment
  const overlayContent = page.locator('.msme-overlay-content');
  await expect(overlayContent).toHaveCSS('text-align', 'right');
});

test('Admin dashboard displays RTL', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/admin-dashboard.html');
  
  // Check admin content is RTL
  await expect(page.locator('.admin-dashboard')).toHaveCSS('direction', 'rtl');
  
  // Check admin sections
  const adminSections = page.locator('.admin-section');
  for (let i = 0; i < await adminSections.count(); i++) {
    await expect(adminSections.nth(i)).toHaveCSS('text-align', 'right');
  }
});
