import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.helper';

test.describe('Purchases Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMockApi(page);
  });

  test('should display responsive tabs, PAMP table and bottom-docked modal on mobile', async ({ page }) => {
    // 1. Authenticate as admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    // 2. Navigate to purchases
    await page.goto('/purchases');
    const purchasesPage = page.locator('[data-testid="purchases-page"]');
    await expect(purchasesPage).toBeVisible({ timeout: 10000 });

    // 3. Verify all 3 mobile tabs are visible without horizontal scroll
    const tabOrders = page.locator('[data-testid="purchases-tab-orders"]');
    const tabSuppliers = page.locator('[data-testid="purchases-tab-suppliers"]');
    const tabPamp = page.locator('[data-testid="purchases-tab-pamp"]');

    await expect(tabOrders).toBeVisible();
    await expect(tabSuppliers).toBeVisible();
    await expect(tabPamp).toBeVisible();
    await expect(tabOrders).toHaveClass(/active/);

    // 4. Switch to PAMP tab and verify mobile card-row table structure
    await tabPamp.click();
    await expect(tabPamp).toHaveClass(/active/);

    const pampTable = page.locator('[data-testid="pamp-table"]');
    await expect(pampTable).toBeVisible();

    const firstPampRow = page.locator('[data-testid^="pamp-row-"]').first();
    await expect(firstPampRow).toBeVisible();
    await expect(firstPampRow.locator('.ing-name')).toBeVisible();
    await expect(firstPampRow.locator('.cost-amount')).toBeVisible();

    // 5. Switch back to Orders tab and inspect purchase order detail modal
    await tabOrders.click();
    await expect(tabOrders).toHaveClass(/active/);

    const firstOrderCard = page.locator('[data-testid^="order-card-"]').first();
    await expect(firstOrderCard).toBeVisible();
    await firstOrderCard.click();

    // 6. Verify modal is presented as a mobile bottom sheet
    const detailModal = page.locator('[data-testid="purchase-order-detail-modal"]');
    await expect(detailModal).toBeVisible();

    const dismissBtn = page.locator('[data-testid="order-detail-dismiss-btn"]');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();
    await expect(detailModal).not.toBeVisible();
  });
});
