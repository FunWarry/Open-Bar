import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Modular Capabilities Settings E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display modular capabilities settings tab and presets', async ({ page }) => {
    await page.goto('/admin/settings?tab=modules');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();

    // Verify modules tab is active or click it
    const tabModules = page.locator('[data-testid="tab-modules"]');
    await expect(tabModules).toBeVisible();
    await tabModules.click();

    // Verify establishment presets
    await expect(page.locator('[data-testid="preset-module-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-module-restaurant"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-module-food_truck"]')).toBeVisible();
    await expect(page.locator('[data-testid="preset-module-nightclub"]')).toBeVisible();

    // Verify capability toggles
    await expect(page.locator('[data-testid="toggle-module-cuisine-kds"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-module-happy-hour"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-module-employee-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-module-floor-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-module-qr-client-ordering"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-module-stock-tracking"]')).toBeVisible();
  });

  test('should apply establishment preset and enable save action', async ({ page }) => {
    await page.goto('/admin/settings?tab=modules');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-modules"]');

    // Click Food Truck preset
    await page.click('[data-testid="preset-module-food_truck"]');

    // Form should become dirty and save button enabled
    await expect(page.locator('[data-testid="status-dirty"]')).toBeVisible();
    const saveBtn = page.locator('[data-testid="btn-save-all-settings"]');
    await expect(saveBtn).toBeEnabled();
  });

  test('should toggle capability and save changes', async ({ page }) => {
    await page.goto('/admin/settings?tab=modules');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-modules"]');

    // Toggle cuisine KDS
    await page.click('[data-testid="toggle-module-cuisine-kds"]');

    // Dirty status appears
    await expect(page.locator('[data-testid="status-dirty"]')).toBeVisible();

    const saveBtn = page.locator('[data-testid="btn-save-all-settings"]');
    await expect(saveBtn).toBeEnabled();

    // Click save and synchronize on status-clean observable indicator
    await saveBtn.click();
    await expect(page.locator('[data-testid="status-clean"]')).toBeVisible();
  });
});
