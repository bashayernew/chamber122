// Authentication helpers for E2E tests
import { Page, expect } from '@playwright/test';

export async function setLang(page: Page, lang: 'en' | 'ar') {
  await page.evaluate((l) => localStorage.setItem('ch122_lang', l), lang);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
}

export async function loginWithForm(page: Page, email: string, password: string) {
  await page.goto('/auth.html');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('sign-in-btn').click();
  await page.waitForLoadState('networkidle');
}

export async function loginAsMSME(page: Page, type: 'pending' | 'approved') {
  const env = process.env;
  const email = type === 'approved' ? env.MSME_APPROVED_EMAIL! : env.MSME_PENDING_EMAIL!;
  const pass = type === 'approved' ? env.MSME_APPROVED_PASSWORD! : env.MSME_PENDING_PASSWORD!;
  await loginWithForm(page, email, pass);
}

export async function loginAsAdmin(page: Page) {
  await loginWithForm(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
}

export async function waitForAuthModal(page: Page) {
  await expect(page.getByTestId('auth-required-modal')).toBeVisible();
}

export async function continueAsGuest(page: Page) {
  await page.getByTestId('auth-continue-guest').click();
  await page.getByTestId('guest-email-input').fill(process.env.GUEST_EMAIL || 'guest@demo.com');
  await page.getByTestId('guest-continue-btn').click();
}

export async function signInInstead(page: Page) {
  await page.getByTestId('auth-sign-in').click();
}
