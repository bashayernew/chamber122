// Pending MSME tests - authenticated but not fully verified
import { test, expect } from '@playwright/test';
import { logout, setLang, loginAsMSME } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await loginAsMSME(page, 'pending');
});

test('Pending MSME can create posts but they show pending status', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/owner-activities.html');
  
  // Should see status indicator showing pending
  await expect(page.getByTestId('status-badge')).toContainText(/pending|في انتظار/i);
  
  // Create a new event
  await page.getByTestId('btn-new-event').click();
  
  // Fill event form
  await page.getByTestId('event-title').fill('Pending MSME Event');
  await page.getByTestId('event-description').fill('This event should be pending');
  await page.getByTestId('event-date').fill('2024-12-25');
  await page.getByTestId('event-location').fill('Test Location');
  
  // Submit event
  await page.getByTestId('event-submit').click();
  
  // Should show pending status message
  await expect(page.getByText(/submitted for review|تم الإرسال للمراجعة/i)).toBeVisible();
});

test('Pending MSME posts are not visible on public pages', async ({ page }) => {
  await setLang(page, 'en');
  
  // Create a post first
  await page.goto('/owner-activities.html');
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('Hidden Event');
  await page.getByTestId('event-description').fill('This should not be public');
  await page.getByTestId('event-submit').click();
  
  // Check public events page
  await page.goto('/events.html');
  
  // Should not see the pending event
  await expect(page.getByText('Hidden Event')).not.toBeVisible();
});

test('Pending MSME sees profile completeness message', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/owner-activities.html');
  
  // Should see profile completeness message
  await expect(page.getByTestId('status-message')).toContainText(/complete|أكمل/i);
  await expect(page.getByTestId('status-message')).toContainText(/80%|٨٠٪/);
});

test('Pending MSME cannot publish instantly', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/events.html');
  
  // Click Add Event
  await page.getByTestId('add-event-btn').click();
  
  // Should show auth modal with status message
  await expect(page.getByTestId('auth-required-modal')).toBeVisible();
  await expect(page.getByText(/complete your profile|أكمل ملفك/i)).toBeVisible();
});

test('Pending MSME flow works in Arabic', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/owner-activities.html');
  
  // Should see Arabic status messages
  await expect(page.getByTestId('status-badge')).toContainText(/في انتظار/i);
  await expect(page.getByTestId('status-message')).toContainText(/أكمل/i);
  
  // Create a post in Arabic
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('فعالية معلقة');
  await page.getByTestId('event-description').fill('هذه فعالية معلقة');
  await page.getByTestId('event-submit').click();
  
  // Should show Arabic success message
  await expect(page.getByText(/تم الإرسال للمراجعة/i)).toBeVisible();
});
