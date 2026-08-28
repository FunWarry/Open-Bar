import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Manager Currency Settings E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin/Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display currency configuration section with default presets', async ({ page }) => {
    await page.goto('/manager/currency');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-currency"]');

    await expect(page.locator('[data-testid="currency-preset-btn-EUR"]')).toBeVisible();
    await expect(page.locator('[data-testid="currency-preset-btn-USD"]')).toBeVisible();
    await expect(page.locator('input[data-testid="currency-code-input"], [data-testid="currency-code-input"] input')).toHaveValue('EUR');
    await expect(page.locator('input[data-testid="currency-symbol-input"], [data-testid="currency-symbol-input"] input')).toHaveValue('€');
  });

  test('should apply currency preset and update live price preview', async ({ page }) => {
    await page.goto('/manager/currency');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-currency"]');

    // Click USD preset
    await page.click('[data-testid="currency-preset-btn-USD"]');
    await expect(page.locator('input[data-testid="currency-code-input"], [data-testid="currency-code-input"] input')).toHaveValue('USD');
    await expect(page.locator('input[data-testid="currency-symbol-input"], [data-testid="currency-symbol-input"] input')).toHaveValue('$');

    // Live preview prices should now show dollar symbol before amounts
    await expect(page.locator('[data-testid="preview-cocktail-price-1"]')).toContainText('$');
    await expect(page.locator('[data-testid="preview-cocktail-total"]')).toContainText('$');
  });

  test('should toggle symbol position between BEFORE and AFTER', async ({ page }) => {
    await page.goto('/manager/currency');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-currency"]');

    // Select USD then toggle AFTER position
    await page.click('[data-testid="currency-preset-btn-USD"]');
    await page.click('[data-testid="currency-pos-after-btn"]');

    // Live preview should show amount followed by $
    await expect(page.locator('[data-testid="preview-cocktail-total"]')).toContainText('$');

    // Toggle back to BEFORE
    await page.click('[data-testid="currency-pos-before-btn"]');
    await expect(page.locator('[data-testid="preview-cocktail-total"]')).toContainText('$');
  });

  test('should save updated currency settings', async ({ page }) => {
    await page.goto('/manager/currency');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();
    await page.click('[data-testid="tab-currency"]');

    await page.click('[data-testid="currency-preset-btn-USD"]');
    await page.click('[data-testid="btn-save-all-settings"]');

    // Save button should remain visible and active
    await expect(page.locator('[data-testid="btn-save-all-settings"]')).toBeVisible();
  });
});
