// Admin dashboard tests
import { test, expect } from '@playwright/test';
import { logout, setLang, loginAsAdmin, loginAsMSME } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await logout(page);
  await loginAsAdmin(page);
});

test('Admin can view approval queues', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Should see MSME approvals queue
  await expect(page.getByTestId('queue-msme-approvals')).toBeVisible();
  
  // Should see guest submissions queues
  await expect(page.getByTestId('queue-guest-events')).toBeVisible();
  await expect(page.getByTestId('queue-guest-bulletins')).toBeVisible();
});

test('Admin can approve MSMEs', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Should see pending MSME in approvals queue
  const pendingMSME = page.getByTestId('queue-msme-approvals').getByTestId('approve-btn').first();
  await expect(pendingMSME).toBeVisible();
  
  // Click approve
  await pendingMSME.click();
  
  // Should show confirmation
  await expect(page.getByText(/approved|تمت الموافقة/i)).toBeVisible();
});

test('Admin can convert guest submissions', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Check guest events queue
  const guestEvent = page.getByTestId('queue-guest-events').getByTestId('convert-btn').first();
  if (await guestEvent.isVisible()) {
    await guestEvent.click();
    await expect(page.getByText(/converted|تم التحويل/i)).toBeVisible();
  }
  
  // Check guest bulletins queue
  const guestBulletin = page.getByTestId('queue-guest-bulletins').getByTestId('convert-btn').first();
  if (await guestBulletin.isVisible()) {
    await guestBulletin.click();
    await expect(page.getByText(/converted|تم التحويل/i)).toBeVisible();
  }
});

test('Admin can reject submissions', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Find a reject button
  const rejectBtn = page.getByTestId('reject-btn').first();
  if (await rejectBtn.isVisible()) {
    await rejectBtn.click();
    await expect(page.getByText(/rejected|تم الرفض/i)).toBeVisible();
  }
});

test('Status changes reflect immediately', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Approve a pending MSME
  const approveBtn = page.getByTestId('approve-btn').first();
  if (await approveBtn.isVisible()) {
    await approveBtn.click();
    
    // Status should change immediately
    await expect(page.getByTestId('status-badge')).toContainText(/approved|موافق/i);
  }
});

test('Admin dashboard shows correct counts', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Should see statistics
  await expect(page.getByTestId('stats-section')).toBeVisible();
  
  // Should see counts for different queues
  await expect(page.getByTestId('msme-count')).toBeVisible();
  await expect(page.getByTestId('events-count')).toBeVisible();
  await expect(page.getByTestId('bulletins-count')).toBeVisible();
});

test('Admin can view detailed submissions', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Click view details on a submission
  const viewDetailsBtn = page.getByTestId('view-details').first();
  if (await viewDetailsBtn.isVisible()) {
    await viewDetailsBtn.click();
    
    // Should show detailed view
    await expect(page.getByTestId('submission-details')).toBeVisible();
  }
});

test('Admin flow works in Arabic', async ({ page }) => {
  await setLang(page, 'ar');
  await page.goto('/admin-dashboard.html');
  
  // Should see Arabic labels
  await expect(page.getByText(/لوحة الإدارة/i)).toBeVisible();
  await expect(page.getByText(/موافقات المشاريع/i)).toBeVisible();
  await expect(page.getByText(/طلبات الضيوف/i)).toBeVisible();
  
  // Should see Arabic action buttons
  await expect(page.getByTestId('approve-btn')).toContainText(/موافقة/i);
  await expect(page.getByTestId('reject-btn')).toContainText(/رفض/i);
  await expect(page.getByTestId('convert-btn')).toContainText(/تحويل/i);
});

test('Admin can filter queues', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Should see filter options
  await expect(page.getByTestId('filter-status')).toBeVisible();
  await expect(page.getByTestId('filter-date')).toBeVisible();
  
  // Test filtering
  await page.getByTestId('filter-status').selectOption('pending');
  
  // Should show only pending items
  const statusBadges = page.getByTestId('status-badge');
  for (let i = 0; i < await statusBadges.count(); i++) {
    await expect(statusBadges.nth(i)).toContainText(/pending/i);
  }
});

test('Admin can bulk approve', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('/admin-dashboard.html');
  
  // Select multiple items
  const checkboxes = page.getByTestId('select-item');
  const count = await checkboxes.count();
  
  if (count > 1) {
    // Select first two items
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    
    // Click bulk approve
    await page.getByTestId('bulk-approve').click();
    
    // Should show confirmation
    await expect(page.getByText(/bulk approved|تمت الموافقة الجماعية/i)).toBeVisible();
  }
});

test('Admin dashboard is responsive', async ({ page }) => {
  await setLang(page, 'en');
  
  // Test desktop view
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/admin-dashboard.html');
  await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  
  // Test mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload();
  await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  
  // Check mobile layout
  await expect(page.locator('.admin-tabs')).toHaveCSS('flex-direction', 'column');
});
