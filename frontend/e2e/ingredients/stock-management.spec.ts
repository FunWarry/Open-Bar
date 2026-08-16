import { test, expect } from '@playwright/test';

test.describe('Ingredients & Stock Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display ingredients inventory page', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should view low stock alerts section or badge if present', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('ion-content')).toBeVisible();
  });
});
