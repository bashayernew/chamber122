// Guest flow tests - unauthenticated user submissions
import { test, expect } from '@playwright/test';
import { logout, setLang, continueAsGuest } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await page.goto('/');
});

test('Guest can submit Event suggestion (pending)', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/events.html');
  
  // Click Add Event button
  await page.getByTestId('add-event-btn').click();
  
  // Should show auth modal
  await expect(page.getByTestId('auth-required-modal')).toBeVisible();
  
  // Continue as Guest
  await page.getByTestId('auth-continue-guest').click();
  
  // Fill guest email
  await page.getByTestId('guest-email-input').fill(process.env.GUEST_EMAIL || 'guest@demo.com');
  await page.getByTestId('guest-continue-btn').click();
  
  // Should show event suggestion modal
  await expect(page.getByTestId('suggest-event-modal')).toBeVisible();
  
  // Fill event suggestion form
  await page.getByTestId('suggest-event-title').fill('Demo Expo 2024');
  await page.getByTestId('suggest-event-date').fill('2024-12-15');
  await page.getByTestId('suggest-event-location').fill('Kuwait City');
  await page.getByTestId('suggest-event-desc').fill('A demo event for testing purposes');
  
  // Submit suggestion
  await page.getByTestId('suggest-event-submit').click();
  
  // Should show success message
  await expect(page.getByText(/submitted for review|تم الإرسال للمراجعة/i)).toBeVisible();
});

test('Guest can submit Bulletin post (pending)', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/bulletin.html');
  
  // Click Add Bulletin button
  await page.getByTestId('add-bulletin-btn').click();
  
  // Should show auth modal
  await expect(page.getByTestId('auth-required-modal')).toBeVisible();
  
  // Continue as Guest
  await page.getByTestId('auth-continue-guest').click();
  
  // Fill guest email
  await page.getByTestId('guest-email-input').fill(process.env.GUEST_EMAIL || 'guest@demo.com');
  await page.getByTestId('guest-continue-btn').click();
  
  // Should show bulletin submission modal
  await expect(page.getByTestId('guest-bulletin-modal')).toBeVisible();
  
  // Fill bulletin form
  await page.getByTestId('guest-bulletin-title').fill('Demo Bulletin Post');
  await page.getByTestId('guest-bulletin-content').fill('This is a demo bulletin post for testing purposes');
  
  // Submit bulletin
  await page.getByTestId('guest-bulletin-submit').click();
  
  // Should show success message
  await expect(page.getByText(/submitted for review|تم الإرسال للمراجعة/i)).toBeVisible();
});

test('Guest submissions go to moderation queues', async ({ page }) => {
  // This test would verify that guest submissions appear in admin queues
  // For now, we'll just verify the submission process works
  await setLang(page, 'en');
  await page.goto('/events.html');
  
  await page.getByTestId('add-event-btn').click();
  await page.getByTestId('auth-continue-guest').click();
  await page.getByTestId('guest-email-input').fill(process.env.GUEST_EMAIL || 'guest@demo.com');
  await page.getByTestId('guest-continue-btn').click();
  
  await page.getByTestId('suggest-event-title').fill('Test Event');
  await page.getByTestId('suggest-event-date').fill('2024-12-20');
  await page.getByTestId('suggest-event-submit').click();
  
  // Verify success message indicates moderation
  await expect(page.getByText(/review|مراجعة/i)).toBeVisible();
});

test('Guest cannot access owner tools', async ({ page }) => {
  await setLang(page, 'en');
  
  // Try to access owner activities directly
  await page.goto('/owner-activities.html');
  
  // Should redirect to auth page
  await expect(page).toHaveURL(/auth\.html/);
  
  // Try to access admin dashboard
  await page.goto('/admin-dashboard.html');
  
  // Should redirect to auth page
  await expect(page).toHaveURL(/auth\.html/);
});

test('Guest flow works in Arabic', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/events.html');
  
  // Click Add Event button
  await page.getByTestId('add-event-btn').click();
  
  // Should show auth modal in Arabic
  await expect(page.getByTestId('auth-required-modal')).toBeVisible();
  
  // Continue as Guest
  await page.getByTestId('auth-continue-guest').click();
  
  // Fill guest email
  await page.getByTestId('guest-email-input').fill(process.env.GUEST_EMAIL || 'guest@demo.com');
  await page.getByTestId('guest-continue-btn').click();
  
  // Should show event suggestion modal
  await expect(page.getByTestId('suggest-event-modal')).toBeVisible();
  
  // Fill and submit form
  await page.getByTestId('suggest-event-title').fill('فعالية تجريبية');
  await page.getByTestId('suggest-event-date').fill('2024-12-15');
  await page.getByTestId('suggest-event-submit').click();
  
  // Should show success message in Arabic
  await expect(page.getByText(/تم الإرسال للمراجعة/i)).toBeVisible();
});
