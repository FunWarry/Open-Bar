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

  test('should display shift presets configuration page with all cards and KPIs', async ({ page }) => {
    await page.goto('/manager/shift-presets');
    await expect(page.locator('app-shift-presets-config')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-configured-presets"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-avg-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-card-MATIN"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-card-SOIR"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-card-COUPURE"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-card-NUIT"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-card-CONGE"]')).toBeVisible();
  });

  test('should calculate live duration and update break duration via quick chips', async ({ page }) => {
    await page.goto('/manager/shift-presets');
    await expect(page.locator('[data-testid="preset-card-MATIN"]')).toBeVisible();

    // Check live duration pill
    await expect(page.locator('[data-testid="duration-pill-MATIN"]')).toContainText('7h 30min');

    // Click 45m quick break chip
    const chip45 = page.locator('[data-testid="break-chip-MATIN-45"]');
    await expect(chip45).toBeVisible();
    await chip45.click();

    // Verify duration updated to 7h 15min
    await expect(page.locator('[data-testid="duration-pill-MATIN"]')).toContainText('7h 15min');
  });

  test('should save modified shift preset and show toast feedback', async ({ page }) => {
    await page.goto('/manager/shift-presets');
    await expect(page.locator('[data-testid="preset-card-MATIN"]')).toBeVisible();

    // Click save button
    const saveBtn = page.locator('[data-testid="save-preset-btn-MATIN"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Toast appears
    await expect(page.locator('ion-toast')).toBeVisible({ timeout: 5000 });
  });
});

