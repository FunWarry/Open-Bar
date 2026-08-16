import { test, expect } from '@playwright/test';

test.describe('Factures & Règlement E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as server / manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display invoices list and allow navigation', async ({ page }) => {
    await page.goto('/factures');
    await expect(page.locator('ion-content')).toBeVisible();
  });
});
