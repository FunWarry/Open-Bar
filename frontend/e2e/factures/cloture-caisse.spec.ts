import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Daily Cash Register Closure (Ticket Z) E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Mock register closure endpoints if needed
    await page.route('**/api/factures/clotures/by-date*', async (route) => {
      // Initially not closed
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null)
      });
    });

    await page.route('**/api/factures/recap/cloturer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          closureNumber: 'Z-2026-00101',
          closureDate: '2026-09-06',
          openingFloat: 150.0,
          theoreticalCash: 250.0,
          countedCash: 250.0,
          cashDiscrepancy: 0.0,
          totalRevenueHT: 250.0,
          totalRevenueTTC: 300.0,
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });

    // Authenticate as manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'manager');
    await page.fill('input[data-testid="login-password"]', 'manager123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should execute full 5-step daily register closure wizard and show certified certificate', async ({ page }) => {
    await page.goto('/factures/recap');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify recap date picker and KPIs are loaded
    await expect(page.locator('[data-testid="recap-date-picker"]')).toBeVisible();

    // Locate and click the "Close register (Z-Report)" CTA button
    const openModalBtn = page.locator('[data-testid="open-cloture-modal-btn"]');
    await expect(openModalBtn).toBeVisible();
    await openModalBtn.click();

    // Step 1: Initial cash drawer opening float
    await expect(page.locator('[data-testid="cloture-step-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="opening-float-input"]')).toBeVisible();
    await page.click('[data-testid="cloture-next-btn"]');

    // Step 2: Physical cash count
    await expect(page.locator('[data-testid="cloture-step-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="live-discrepancy-value"]')).toBeVisible();

    // Increment 50€ bill count
    const plus50Btn = page.locator('[data-testid="plus-btn-50e"]');
    if (await plus50Btn.isVisible()) {
      await plus50Btn.click();
      await plus50Btn.click();
    }
    await page.click('[data-testid="cloture-next-btn"]');

    // Step 3: Discrepancy justification
    await expect(page.locator('[data-testid="cloture-step-3"]')).toBeVisible();
    const reasonInput = page.locator('[data-testid="discrepancy-reason-input"]');
    if (await reasonInput.isVisible()) {
      await reasonInput.fill('Cash drawer count adjustment');
    }
    await page.click('[data-testid="cloture-next-btn"]');

    // Step 4: Summary and legal lock warning
    await expect(page.locator('[data-testid="cloture-step-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="legal-lock-warning"]')).toBeVisible();

    // Confirm closure
    await page.click('[data-testid="cloture-confirm-btn"]');

    // Step 5: Official certificate & SHA-256 digital sealing
    await expect(page.locator('[data-testid="cloture-step-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="sha256-hash-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="print-z-ticket-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-z-pdf-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-fec-btn"]')).toBeVisible();

    // Close modal
    await page.click('[data-testid="cloture-finish-btn"]');
  });
});
