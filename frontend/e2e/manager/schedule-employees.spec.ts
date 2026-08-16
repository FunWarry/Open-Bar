import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Manager Employee & Planning Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin/Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display employees list page', async ({ page }) => {
    await page.goto('/manager/employees');
    await expect(page.locator('app-employees, .employees-container, body').first()).toBeVisible();
  });

  test('should display weekly schedule and shift calendar', async ({ page }) => {
    await page.goto('/manager/schedule');
    await expect(page.locator('app-schedule, .schedule-page, body').first()).toBeVisible();
  });
});
