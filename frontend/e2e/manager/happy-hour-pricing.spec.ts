import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Manager Happy Hour & Dynamic Pricing E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin/Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display Happy Hour pricing configuration tab and section', async ({ page }) => {
    await page.goto('/manager/pricing');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();

    // Verify Happy Hour section header and elements
    await expect(page.locator('[data-testid="happy-hour-config-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-add-happy-hour-rule"]')).toBeVisible();
    await expect(page.locator('[data-testid="rules-count-badge"]')).toBeVisible();
  });

  test('should open create rule modal, fill form, and save new promotional rule', async ({ page }) => {
    await page.goto('/manager/pricing');
    await expect(page.locator('[data-testid="happy-hour-config-section"]')).toBeVisible();

    // Click Add Rule button
    await page.click('[data-testid="btn-add-happy-hour-rule"]');
    await expect(page.locator('[data-testid="rule-config-modal"]')).toBeVisible();

    // Fill rule details
    await page.fill('[data-testid="input-rule-name"]', 'Summer Sunset HH');
    await page.fill('[data-testid="input-rule-start-time"]', '17:00');
    await page.fill('[data-testid="input-rule-end-time"]', '20:00');
    await page.fill('[data-testid="input-rule-discount-value"]', '25');

    // Click Friday day toggle
    await page.click('[data-testid="btn-day-FRIDAY"]');

    // Save rule
    await page.click('[data-testid="btn-save-rule"]');

    // Modal should close
    await expect(page.locator('[data-testid="rule-config-modal"]')).not.toBeVisible();
  });

  test('should display live simulator and preview discounted price', async ({ page }) => {
    await page.goto('/manager/pricing');
    await expect(page.locator('[data-testid="happy-hour-config-section"]')).toBeVisible();

    // Verify simulator card exists
    await expect(page.locator('[data-testid="happy-hour-simulator-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-simulator-cocktail"]')).toBeVisible();

    // Change simulated time
    await page.fill('[data-testid="input-simulator-time"]', '19:00');

    // Simulation result box should be present
    const resultBox = page.locator('[data-testid="simulator-result-box"]');
    await expect(resultBox).toBeVisible();
    await expect(page.locator('[data-testid="sim-base-price"]')).toBeVisible();
  });

  test('should support navigation via direct route /admin/pricing', async ({ page }) => {
    await page.goto('/admin/pricing');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="happy-hour-config-section"]')).toBeVisible();
  });
});
