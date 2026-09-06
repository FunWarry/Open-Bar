import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('KDS Kitchen Display Screen E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as barman / kitchen user
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'barman1');
    await page.fill('input[data-testid="login-password"]', 'barman123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display KDS kitchen header and filter chips', async ({ page }) => {
    await page.goto('/kitchen');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify filter chips exist
    await expect(page.locator('[data-testid="kds-filter-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="kds-filter-ready"]')).toBeVisible();
    await expect(page.locator('[data-testid="kds-filter-all"]')).toBeVisible();

    // Verify sound toggle and refresh buttons
    await expect(page.locator('[data-testid="kds-sound-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="kds-refresh-btn"]')).toBeVisible();
  });

  test('should toggle sound alert', async ({ page }) => {
    await page.goto('/kitchen');
    const soundToggle = page.locator('[data-testid="kds-sound-toggle"]');
    await expect(soundToggle).toBeVisible();
    await soundToggle.click();
    // Toast should show up
    await expect(page.locator('ion-toast')).toBeVisible({ timeout: 5000 });
  });

  test('should switch filter tabs and handle empty/card states', async ({ page }) => {
    await page.goto('/kitchen');

    // Click Ready filter
    await page.click('[data-testid="kds-filter-ready"]');
    await expect(page.locator('[data-testid="kds-filter-ready"]')).toHaveClass(/chip-selected/);

    // Click All filter
    await page.click('[data-testid="kds-filter-all"]');
    await expect(page.locator('[data-testid="kds-filter-all"]')).toHaveClass(/chip-selected/);

    // Click Active filter
    await page.click('[data-testid="kds-filter-active"]');
    await expect(page.locator('[data-testid="kds-filter-active"]')).toHaveClass(/chip-selected/);

    // Either cards or empty state is visible
    const hasCards = await page.locator('[data-testid="kds-order-card"]').count() > 0;
    if (hasCards) {
      await expect(page.locator('[data-testid="kds-order-card"]').first()).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="kds-empty-state"]')).toBeVisible();
    }
  });

  test('should navigate to /kitchen when visiting /cuisine', async ({ page }) => {
    await page.goto('/cuisine');
    await expect(page.locator('ion-content')).toBeVisible();
    await expect(page.locator('[data-testid="kds-filter-active"]')).toBeVisible();
  });
});
