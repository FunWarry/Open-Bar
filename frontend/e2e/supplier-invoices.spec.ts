import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.helper';

test.describe('Supplier Invoices & Factur-X Ingestion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should navigate to purchases, switch to invoices tab and open upload modal', async ({ page }) => {
    // 1. Authenticate as manager/admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    // 2. Navigate to purchases view
    await page.goto('/purchases');
    const purchasesPage = page.locator('[data-testid="purchases-page"]');
    await expect(purchasesPage).toBeVisible({ timeout: 10000 });

    // 3. Verify the Invoices tab exists and click it
    const invoicesTab = page.locator('[data-testid="purchases-tab-invoices"]');
    await expect(invoicesTab).toBeVisible();
    await invoicesTab.click();
    await expect(invoicesTab).toHaveClass(/active/);

    // 4. Verify status filter chips are visible
    const allFilter = page.locator('[data-testid="filter-inv-status-all"]');
    const pendingFilter = page.locator('[data-testid="filter-inv-status-pending"]');
    await expect(allFilter).toBeVisible();
    await expect(pendingFilter).toBeVisible();

    // 5. Open invoice upload modal
    const uploadBtn = page.locator('[data-testid="upload-invoice-btn"], [data-testid="empty-upload-invoice-btn"]').first();
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    // 6. Verify modal drop zone is displayed
    const dropZone = page.locator('[data-testid="invoice-drop-zone"]');
    await expect(dropZone).toBeVisible({ timeout: 5000 });

    // 7. Close modal
    const closeBtn = page.locator('app-modal button.modal-close-btn, app-modal [data-testid="modal-close-btn"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dropZone).not.toBeVisible({ timeout: 5000 });
    }
  });
});
