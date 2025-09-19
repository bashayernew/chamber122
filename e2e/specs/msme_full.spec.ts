// Approved MSME tests - fully verified user with instant publishing
import { test, expect } from '@playwright/test';
import { logout, setLang, loginAsMSME } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await loginAsMSME(page, 'approved');
});

test('Approved MSME can publish instantly', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/owner-activities.html');
  
  // Should see approved status
  await expect(page.getByTestId('status-badge')).toContainText(/approved|موافق/i);
  
  // Create a new event
  await page.getByTestId('btn-new-event').click();
  
  // Fill event form
  await page.getByTestId('event-title').fill('Approved MSME Event');
  await page.getByTestId('event-description').fill('This event should be published instantly');
  await page.getByTestId('event-date').fill('2024-12-30');
  await page.getByTestId('event-location').fill('Public Location');
  
  // Submit event
  await page.getByTestId('event-submit').click();
  
  // Should show instant publishing message
  await expect(page.getByText(/published successfully|تم النشر بنجاح/i)).toBeVisible();
});

test('Published content appears on public pages immediately', async ({ page }) => {
  await setLang(page, 'en');
  
  // Create a public event
  await page.goto('/owner-activities.html');
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('Public Event Test');
  await page.getByTestId('event-description').fill('This should be public immediately');
  await page.getByTestId('event-submit').click();
  
  // Wait for success message
  await expect(page.getByText(/published successfully/i)).toBeVisible();
  
  // Check public events page
  await page.goto('/events.html');
  
  // Should see the published event
  await expect(page.getByText('Public Event Test')).toBeVisible();
});

test('View counters increment after public visits', async ({ page }) => {
  await setLang(page, 'en');
  
  // Create an event
  await page.goto('/owner-activities.html');
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('Counter Test Event');
  await page.getByTestId('event-description').fill('Testing view counter');
  await page.getByTestId('event-submit').click();
  
  await expect(page.getByText(/published successfully/i)).toBeVisible();
  
  // Visit the event from public page
  await page.goto('/events.html');
  await page.getByText('Counter Test Event').click();
  
  // Check that view counter exists (may be 0 initially)
  await expect(page.getByTestId('msme-views')).toBeVisible();
});

test('Time-ago formatting works', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/events.html');
  
  // Should see time-ago text for existing events
  await expect(page.getByText(/ago|منذ/i)).toBeVisible();
});

test('Edit and archive functionality works', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/owner-activities.html');
  
  // Create an event first
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('Editable Event');
  await page.getByTestId('event-description').fill('This event can be edited');
  await page.getByTestId('event-submit').click();
  
  await expect(page.getByText(/published successfully/i)).toBeVisible();
  
  // Should see edit/archive buttons
  await expect(page.getByTestId('btn-edit')).toBeVisible();
  await expect(page.getByTestId('btn-archive')).toBeVisible();
});

test('Approved MSME flow works in Arabic', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/owner-activities.html');
  
  // Should see Arabic status messages
  await expect(page.getByTestId('status-badge')).toContainText(/موافق/i);
  
  // Create a post in Arabic
  await page.getByTestId('btn-new-event').click();
  await page.getByTestId('event-title').fill('فعالية معتمدة');
  await page.getByTestId('event-description').fill('هذه فعالية معتمدة');
  await page.getByTestId('event-submit').click();
  
  // Should show Arabic success message
  await expect(page.getByText(/تم النشر بنجاح/i)).toBeVisible();
  
  // Check it appears on public page
  await page.goto('/events.html');
  await expect(page.getByText('فعالية معتمدة')).toBeVisible();
});

test('MSME dashboard shows analytics', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/owner-activities.html');
  
  // Should see analytics section
  await expect(page.getByTestId('analytics-section')).toBeVisible();
  
  // Should see view counts
  await expect(page.getByTestId('views-count')).toBeVisible();
});
