import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Manager Order Timers & Alerts Settings E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin/Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display order timers configuration page with current values', async ({ page }) => {
    await page.goto('/manager/timers');
    await expect(page.locator('[data-testid="unified-app-settings-page"], app-settings-page, app-order-timers-settings')).toBeVisible();

    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('3 min');
    await expect(page.locator('[data-testid="urgent-value-display"]')).toContainText('5 min');
    await expect(page.locator('[data-testid="critical-value-display"]')).toContainText('10 min');
  });

  test('should adjust threshold values using stepper buttons', async ({ page }) => {
    await page.goto('/manager/timers');
    await expect(page.locator('[data-testid="unified-app-settings-page"], app-settings-page, app-order-timers-settings')).toBeVisible();

    await page.click('[data-testid="warning-btn-plus"]');
    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('4 min');

    await page.click('[data-testid="warning-btn-minus"]');
    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('3 min');
  });

  test('should apply pace preset on button click', async ({ page }) => {
    await page.goto('/manager/timers');
    await expect(page.locator('[data-testid="unified-app-settings-page"], app-settings-page, app-order-timers-settings')).toBeVisible();

    await page.click('[data-testid="preset-btn-fast"]');
    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('2 min');
    await expect(page.locator('[data-testid="urgent-value-display"]')).toContainText('4 min');
    await expect(page.locator('[data-testid="critical-value-display"]')).toContainText('7 min');
  });

  test('should reset to default thresholds (3 / 5 / 10 min)', async ({ page }) => {
    await page.goto('/manager/timers');
    await expect(page.locator('[data-testid="unified-app-settings-page"], app-settings-page, app-order-timers-settings')).toBeVisible();

    await page.click('[data-testid="preset-btn-lounge"]');
    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('5 min');

    await page.click('[data-testid="btn-reset-defaults"]');
    await expect(page.locator('[data-testid="warning-value-display"]')).toContainText('3 min');
    await expect(page.locator('[data-testid="urgent-value-display"]')).toContainText('5 min');
    await expect(page.locator('[data-testid="critical-value-display"]')).toContainText('10 min');
  });

  test('should save updated alert thresholds', async ({ page }) => {
    await page.goto('/manager/timers');
    await expect(page.locator('[data-testid="unified-app-settings-page"], app-settings-page, app-order-timers-settings')).toBeVisible();

    await page.click('[data-testid="preset-btn-fast"]');
    await page.click('[data-testid="btn-save-all-settings"]');

    // Button should be visible after save
    await expect(page.locator('[data-testid="btn-save-all-settings"]')).toBeVisible();
  });
});
