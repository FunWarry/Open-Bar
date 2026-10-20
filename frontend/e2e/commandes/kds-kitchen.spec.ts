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

  test('should display modern KDS kitchen header and filter chips', async ({ page }) => {
    await page.goto('/kitchen');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify brand title and station filters exist
    await expect(page.locator('.toolbar-brand')).toBeVisible();
    await expect(page.locator('[data-testid="chip-station-kitchen"]')).toBeVisible();
    await expect(page.locator('[data-testid="chip-filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="chip-filter-urgent"]')).toBeVisible();

    // Verify sound toggle and refresh buttons
    await expect(page.locator('[data-testid="barman-sound-toggle-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="refresh-orders-btn"]')).toBeVisible();
  });

  test('should toggle sound alert and display feedback toast', async ({ page }) => {
    await page.goto('/kitchen');
    const soundToggle = page.locator('[data-testid="barman-sound-toggle-btn"]');
    await expect(soundToggle).toBeVisible();
    await soundToggle.click();
    // Toast should show up
    await expect(page.locator('ion-toast')).toBeVisible({ timeout: 5000 });
  });

  test('should switch view mode segment between tickets and batch rush mode', async ({ page }) => {
    await page.goto('/kitchen');
    const segment = page.locator('[data-testid="barman-view-mode-segment"]');
    await expect(segment).toBeVisible();

    // Click Batch mode
    await page.click('[data-testid="segment-view-batch"]');
    await expect(page.locator('[data-testid="segment-view-batch"]')).toHaveClass(/active-segment/);

    // Click Tickets mode
    await page.click('[data-testid="segment-view-tickets"]');
    await expect(page.locator('[data-testid="segment-view-tickets"]')).toHaveClass(/active-segment/);
  });

  test('should switch filter chips and handle urgent toggle', async ({ page }) => {
    await page.goto('/kitchen');

    // Click Urgent filter
    await page.click('[data-testid="chip-filter-urgent"]');
    await expect(page.locator('[data-testid="chip-filter-urgent"]')).toHaveClass(/chip--active/);

    // Click All filter
    await page.click('[data-testid="chip-filter-all"]');
    await expect(page.locator('[data-testid="chip-filter-all"]')).toHaveClass(/chip--active/);
  });

  test('should redirect to /kitchen when visiting /cuisine', async ({ page }) => {
    await page.goto('/cuisine');
    await page.waitForURL((url) => url.pathname.includes('/kitchen'), { timeout: 10000 });
    await expect(page.locator('ion-content')).toBeVisible();
    await expect(page.locator('[data-testid="chip-station-kitchen"]')).toBeVisible();
  });
});
