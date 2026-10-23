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

  test('should display modern KDS kitchen header and filter controls', async ({ page }) => {
    await page.goto('/kitchen');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify brand title and filter dropdowns exist
    await expect(page.locator('.toolbar-brand')).toBeVisible();
    await expect(page.locator('[data-testid="select-urgent-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-station-filter"]')).toBeVisible();
    await expect(page.locator('ion-refresher')).toBeAttached();
  });

  test('should filter orders via search bar', async ({ page }) => {
    await page.goto('/kitchen');
    const searchBar = page.locator('[data-testid="barman-searchbar"]');
    await expect(searchBar).toBeVisible();
    await searchBar.fill('Mojito');
    await expect(searchBar).toHaveValue('Mojito');
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

  test('should switch filter dropdowns and handle urgent toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/barman');
    const urgentSelect = page.locator('[data-testid="select-urgent-filter"]');
    await expect(urgentSelect).toBeVisible();

    const trigger = page.locator('[data-testid="select-urgent-filter-trigger"]');
    await trigger.click();

    const dropdown = page.locator('[data-testid="select-urgent-filter-dropdown"]');
    await expect(dropdown).toBeVisible();

    // Select Urgent
    const urgentOption = page.locator('[data-testid="select-urgent-filter-option-true"]');
    await urgentOption.click();
    await expect(dropdown).toBeHidden();

    // Test Station filter dropdown if visible
    const stationSelect = page.locator('[data-testid="select-station-filter"]');
    if (await stationSelect.isVisible()) {
      const stationTrigger = page.locator('[data-testid="select-station-filter-trigger"]');
      await stationTrigger.click();
      const stationDropdown = page.locator('[data-testid="select-station-filter-dropdown"]');
      await expect(stationDropdown).toBeVisible();
    }
  });

  test('should redirect to /kitchen when visiting /cuisine', async ({ page }) => {
    await page.goto('/cuisine');
    await page.waitForURL((url) => url.pathname.includes('/kitchen'), { timeout: 10000 });
    await expect(page.locator('ion-content')).toBeVisible();
    await expect(page.locator('[data-testid="select-urgent-filter"]')).toBeVisible();
  });
});
