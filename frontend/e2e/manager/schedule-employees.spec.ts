import { test, expect } from '@playwright/test';

test.describe('Manager Employee & Planning Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'manager');
    await page.fill('input[data-testid="login-password"]', 'manager123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display employees list page', async ({ page }) => {
    await page.goto('/manager/employees');
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should display weekly schedule and shift calendar', async ({ page }) => {
    await page.goto('/manager/schedule');
    await expect(page.locator('ion-content')).toBeVisible();
  });
});
