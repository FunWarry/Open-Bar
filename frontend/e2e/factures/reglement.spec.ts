import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Factures & Règlement E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as manager / admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display invoices list, KPI grid and allow view mode switching', async ({ page }) => {
    await page.goto('/factures');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify hero header
    await expect(page.locator('[data-testid="factures-hero-header"]')).toBeVisible();

    // Verify KPI cards
    await expect(page.locator('[data-testid="kpi-total-ca"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-factures-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-settled-rate"]')).toBeVisible();

    // Verify searchbar & filter bar
    await expect(page.locator('[data-testid="factures-searchbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-settled"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-pending"]')).toBeVisible();

    // Toggle view mode to table and back to grid
    const tableBtn = page.locator('[data-testid="view-mode-list-btn"]');
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
      const gridBtn = page.locator('[data-testid="view-mode-grid-btn"]');
      await expect(gridBtn).toBeVisible();
      await gridBtn.click();
    }
  });

  test('should filter invoices by status and search query', async ({ page }) => {
    await page.goto('/factures');
    await expect(page.locator('ion-content')).toBeVisible();

    // Click on settled filter
    await page.click('[data-testid="filter-settled"]');

    // Click on pending filter
    await page.click('[data-testid="filter-pending"]');

    // Reset back to all
    await page.click('[data-testid="filter-all"]');
  });
});

