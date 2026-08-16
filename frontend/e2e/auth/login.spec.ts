import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Authentication E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should display login form with all elements', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[data-testid="login-username"]')).toBeVisible();
    await expect(page.locator('input[data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('button[data-testid="login-btn"]')).toBeVisible();
  });

  test('should show error toast on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'wrongpassword');
    await page.click('button[data-testid="login-btn"]');

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  });

  test('should login as ADMIN and logout successfully', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');

    // Wait for redirect to app-home
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/auth/login');

    // Test logout if header user trigger is visible
    const userBtn = page.locator('#header-user-trigger');
    if (await userBtn.isVisible()) {
      await userBtn.click();
      await page.locator('[data-testid="header-logout-btn"]').click();
      await page.waitForURL('**/auth/login', { timeout: 10000 });
      expect(page.url()).toContain('/auth/login');
    }
  });

  test('should login as SERVEUR', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'serveur1');
    await page.fill('input[data-testid="login-password"]', 'serveur123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/auth/login');
  });

  test('should login as BARMAN', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'barman1');
    await page.fill('input[data-testid="login-password"]', 'barman123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/auth/login');
  });

  test('should login as MANAGER', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'manager');
    await page.fill('input[data-testid="login-password"]', 'manager123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/auth/login');
  });
});
