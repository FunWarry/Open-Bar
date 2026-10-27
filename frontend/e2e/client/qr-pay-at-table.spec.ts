import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('QR Pay-at-Table Mobile Settlement E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('openbar_guest_name', 'Client');
    });

    // Mock live bill summary for table
    await page.route('**/api/public/tables/*/payments/bill**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tableId: 1,
          tableNumber: 1,
          tableName: 'Table 1',
          zone: 'SALLE',
          currency: 'EUR',
          paymentProvider: 'SANDBOX',
          subtotalVatExcluded: 25.0,
          vatAmount: 5.0,
          subtotalVatIncluded: 30.0,
          alreadyPaidAmount: 0.0,
          remainingBalance: 30.0,
          isFullySettled: false,
          unsettledItems: [
            {
              ligneId: 101,
              boissonId: 1,
              boissonNom: 'Mojito',
              quantite: 2,
              prixUnitaire: 10.0,
              totalLigne: 20.0,
              guestName: 'Client',
            },
            {
              ligneId: 102,
              boissonId: 2,
              boissonNom: 'Bière Blonde',
              quantite: 2,
              prixUnitaire: 5.0,
              totalLigne: 10.0,
              guestName: 'Ami',
            },
          ],
          settlements: [],
        }),
      });
    });

    // Mock payment intent creation
    await page.route('**/api/public/tables/*/payments/intent**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transactionId: 'tx_sandbox_001',
          clientSecret: 'sec_sandbox_001',
          amount: 15.0,
          tip: 1.5,
          totalCharged: 16.5,
          currency: 'EUR',
          paymentProvider: 'SANDBOX',
          receiptDownloadUrl: '/api/public/tables/1/payments/tx_sandbox_001/receipt.pdf',
        }),
      });
    });

    // Mock sandbox confirmation
    await page.route('**/api/public/tables/*/payments/confirm-sandbox**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transactionId: 'tx_sandbox_001',
          status: 'SUCCEEDED',
          baseAmount: 15.0,
          tipAmount: 1.5,
          totalAmount: 16.5,
          currency: 'EUR',
          tableLiberated: false,
          isTableFullySettled: false,
          remainingBalance: 15.0,
          receiptUrl: '/api/public/tables/1/payments/tx_sandbox_001/receipt.pdf',
        }),
      });
    });

    // Mock email receipt delivery
    await page.route('**/api/public/tables/*/payments/*/receipt-email**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SENT' }),
      });
    });

    // Mock table liberation
    await page.route('**/api/public/tables/*/payments/liberate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('should display pay at table action box and open payment modal', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const openModalBtn = page.locator('[data-testid="btn-pay-at-table-trigger"]');
    await expect(openModalBtn).toBeVisible({ timeout: 5000 });
    await openModalBtn.click();

    // Verify modal elements
    const modalBackdrop = page.locator('[data-testid="payment-modal-backdrop"]');
    const modalContent = page.locator('[data-testid="payment-modal-card"]');
    await expect(modalBackdrop).toBeVisible();
    await expect(modalContent).toBeVisible();

    // Verify bill breakdown
    const billOverview = page.locator('[data-testid="bill-overview-card"]');
    await expect(billOverview).toBeVisible();
  });

  test('should support split mode selection, tip computation, and complete sandbox settlement', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const openModalBtn = page.locator('[data-testid="btn-pay-at-table-trigger"]');
    await expect(openModalBtn).toBeVisible({ timeout: 5000 });
    await openModalBtn.click();

    // Select EQUAL_SPLIT mode
    const equalSplitBtn = page.locator('[data-testid="btn-split-equal"]');
    await expect(equalSplitBtn).toBeVisible();
    await equalSplitBtn.click();

    // Select 10% tip
    const tipChip = page.locator('[data-testid="chip-tip-10"]');
    await expect(tipChip).toBeVisible();
    await tipChip.click();

    // Execute Sandbox payment
    const payBtn = page.locator('[data-testid="btn-pay-card-simulated"]');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // Verify payment success view
    const successView = page.locator('[data-testid="payment-success-view"]');
    await expect(successView).toBeVisible({ timeout: 5000 });

    // Verify PDF download button
    const downloadPdfBtn = page.locator('[data-testid="btn-download-receipt-pdf"]');
    await expect(downloadPdfBtn).toBeVisible();

    // Test email receipt sending
    const emailInput = page.locator('[data-testid="input-receipt-email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('client@example.com');

    const sendEmailBtn = page.locator('[data-testid="btn-submit-receipt-email"]');
    await expect(sendEmailBtn).toBeVisible();
    await sendEmailBtn.click();

    // Close modal
    const closeBtn = page.locator('[data-testid="btn-done-payment-success"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('[data-testid="payment-modal-card"]')).not.toBeVisible();
  });
});
