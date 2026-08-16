import { test, expect } from '@playwright/test';

test.describe('Serveur Order Creation E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as server
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'serveur1');
    await page.fill('input[data-testid="login-password"]', 'serveur123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should view server dashboard with tables and floor plan', async ({ page }) => {
    await page.goto('/dashboard-serveur');
    // Ensure dashboard content or table cards load
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should navigate to orders list', async ({ page }) => {
    await page.goto('/commandes');
    await expect(page.locator('ion-content')).toBeVisible();
  });
});
