import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Purchases, Suppliers & Delivery Intake E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display purchases management page with tabs and order list', async ({ page }) => {
    await page.goto('/purchases');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify tabs
    await expect(page.locator('[data-testid="purchases-tab-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchases-tab-suppliers"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchases-tab-pamp"]')).toBeVisible();

    // Verify order in list
    await expect(page.locator('text=BC-2026-0001')).toBeVisible();
  });

  test('should switch between orders, suppliers and PAMP views', async ({ page }) => {
    await page.goto('/purchases');

    // Switch to suppliers tab
    await page.click('[data-testid="purchases-tab-suppliers"]');
    await expect(page.locator('text=Brasserie du Mont-Blanc')).toBeVisible();

    // Switch to PAMP tab
    await page.click('[data-testid="purchases-tab-pamp"]');
    await expect(page.locator('[data-testid="purchases-search-input"]')).toBeVisible();

    // Switch back to orders tab
    await page.click('[data-testid="purchases-tab-orders"]');
    await expect(page.locator('[data-testid="new-order-btn"]')).toBeVisible();
  });

  test('should open and close barcode scanner modal with manual fallback', async ({ page }) => {
    await page.goto('/purchases');

    // Open scanner modal
    await page.click('[data-testid="global-barcode-scan-btn"]');

    // Verify manual input fallback is available
    const manualInput = page.locator('[data-testid="barcode-manual-input"]');
    await expect(manualInput).toBeVisible();

    // Type a barcode manually and cancel
    await manualInput.fill('3760049010012');
    await page.click('[data-testid="scanner-cancel-btn"]');

    // Modal should dismiss
    await expect(page.locator('[data-testid="barcode-manual-input"]')).not.toBeVisible();
  });
});
