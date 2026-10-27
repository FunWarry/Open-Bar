import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('QR Pay-at-Table Mobile Settlement E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('openbar_guest_name', 'Client');
    });
  });

  test('should display pay at table action box and open payment modal', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const openModalBtn = page.locator('[data-testid="btn-open-payment-modal"]');
    await expect(openModalBtn).toBeVisible({ timeout: 5000 });
    await openModalBtn.click();

    // Verify modal elements
    const modalBackdrop = page.locator('[data-testid="payment-modal-backdrop"]');
    const modalContent = page.locator('[data-testid="payment-modal-card"]');
    await expect(modalBackdrop).toBeVisible();
    await expect(modalContent).toBeVisible();

    // Verify bill breakdown
    const billItems = page.locator('[data-testid="bill-items-list"]');
    await expect(billItems).toBeVisible();
  });

  test('should support split mode selection, tip computation, and complete sandbox settlement', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const openModalBtn = page.locator('[data-testid="btn-open-payment-modal"]');
    await expect(openModalBtn).toBeVisible({ timeout: 5000 });
    await openModalBtn.click();

    // Select EQUAL_SPLIT mode
    const equalSplitChip = page.locator('[data-testid="split-chip-EQUAL_SPLIT"]');
    await expect(equalSplitChip).toBeVisible();
    await equalSplitChip.click();

    // Select 10% tip
    const tipChip = page.locator('[data-testid="tip-chip-10"]');
    await expect(tipChip).toBeVisible();
    await tipChip.click();

    // Execute Sandbox payment
    const payBtn = page.locator('[data-testid="btn-pay-sandbox-card"]');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // Verify payment success view
    const successView = page.locator('[data-testid="payment-success-view"]');
    await expect(successView).toBeVisible({ timeout: 5000 });

    // Verify PDF download button
    const downloadPdfBtn = page.locator('[data-testid="btn-download-pdf-receipt"]');
    await expect(downloadPdfBtn).toBeVisible();

    // Test email receipt sending
    const emailInput = page.locator('[data-testid="input-receipt-email"] input');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('client@example.com');

    const sendEmailBtn = page.locator('[data-testid="btn-send-email-receipt"]');
    await expect(sendEmailBtn).toBeVisible();
    await sendEmailBtn.click();

    // Test liberating table
    const liberateBtn = page.locator('[data-testid="btn-liberate-table"]');
    if (await liberateBtn.isVisible()) {
      await liberateBtn.click();
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="btn-close-payment-modal"]');
    await closeBtn.click();
    await expect(page.locator('[data-testid="payment-modal-card"]')).not.toBeVisible();
  });
});
