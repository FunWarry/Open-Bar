import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Cash Drawer Lifecycle & Mid-Shift X-Report E2E Flow (#450)', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    let isDrawerOpened = false;

    // Mock Cash Drawer Endpoints
    await page.route('**/api/cash-drawer/status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isModuleEnabled: true,
          date: '2026-09-18',
          hasSession: isDrawerOpened,
          isOpened: isDrawerOpened,
          isClosed: false,
          startingFloat: isDrawerOpened ? 150.0 : 0,
          totalCashSales: isDrawerOpened ? 80.0 : 0,
          totalCashIn: 0,
          totalCashDrop: 0,
          totalPaidOut: 0,
          currentTheoreticalCash: isDrawerOpened ? 230.0 : 0,
          totalMovementsCount: 0
        })
      });
    });

    await page.route('**/api/cash-drawer/open', async (route) => {
      isDrawerOpened = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 50,
          sessionDate: '2026-09-18',
          openedAt: new Date().toISOString(),
          openingFloat: 150.0,
          status: 'OPEN',
          notes: 'Morning float verified'
        })
      });
    });

    await page.route('**/api/cash-drawer/movement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          sessionId: 50,
          type: 'CASH_DROP',
          amount: 50.0,
          reason: 'Transfert coffre fort',
          receiptReference: 'REF-001',
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/cash-drawer/x-report*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reportDate: '2026-09-18',
          generatedAt: new Date().toISOString(),
          generatedBy: 'manager',
          openingFloat: 150.0,
          totalRevenueHT: 150.0,
          totalRevenueTTC: 180.0,
          totalCashRevenue: 80.0,
          totalCashIn: 0,
          totalCashDrop: 50.0,
          totalPaidOut: 0,
          theoreticalCashInDrawer: 180.0,
          movements: [
            {
              id: 101,
              sessionId: 50,
              type: 'CASH_DROP',
              amount: 50.0,
              reason: 'Transfert coffre fort',
              timestamp: new Date().toISOString()
            }
          ],
          ventilationModePaiement: [
            { modePaiement: 'ESPECES', count: 3, totalTtc: 80.0 },
            { modePaiement: 'CARTE', count: 4, totalTtc: 100.0 }
          ],
          ventilationTva: [
            { taux: 20.0, tauxLabel: '20%', baseHt: 150.0, montantTva: 30.0, totalTtc: 180.0 }
          ]
        })
      });
    });

    await page.route('**/api/cash-drawer/x-report/pdf*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 Mock PDF content')
      });
    });

    await page.route('**/api/cash-drawer/x-report/print*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          role: 'CASH_DESK',
          ip: '192.168.1.103',
          port: 9100,
          message: 'Printed successfully',
          durationMs: 40
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

  test('should execute full cash drawer lifecycle: opening float, safe drop movement, and intermediate X-Report', async ({ page }) => {
    await page.goto('/factures/recap');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify cash drawer status card is rendered
    const drawerCard = page.locator('[data-testid="cash-drawer-status-card"]');
    await expect(drawerCard).toBeVisible();

    // Verify closed badge and open button initially
    await expect(page.locator('[data-testid="drawer-status-closed-badge"]')).toBeVisible();
    const openBtn = page.locator('[data-testid="btn-open-cash-drawer"]');
    await expect(openBtn).toBeVisible();

    // 1. Open morning drawer modal
    await openBtn.click();
    await expect(page.locator('[data-testid="cash-opening-modal-title"]')).toBeVisible();

    // Select preset 150€
    const preset150 = page.locator('[data-testid="cash-opening-preset-150"]');
    if (await preset150.isVisible()) {
      await preset150.click();
    }

    // Add optional opening note
    const notesInput = page.locator('[data-testid="cash-opening-notes-input"]');
    if (await notesInput.isVisible()) {
      await notesInput.fill('Verified morning float');
    }

    // Confirm drawer opening
    await page.click('[data-testid="cash-opening-confirm-btn"]');

    // Drawer should now be open
    await expect(page.locator('[data-testid="drawer-status-open-badge"]')).toBeVisible();

    // 2. Perform intra-day cash movement (CASH_DROP)
    const movementBtn = page.locator('[data-testid="btn-open-cash-movement"]');
    await expect(movementBtn).toBeVisible();
    await movementBtn.click();

    await expect(page.locator('[data-testid="cash-movement-modal-title"]')).toBeVisible();
    const reasonInput = page.locator('[data-testid="cash-movement-reason-input"]');
    await reasonInput.fill('Transfert coffre fort');

    await page.click('[data-testid="cash-movement-confirm-btn"]');

    // 3. Generate intermediate X-Report
    const xReportBtn = page.locator('[data-testid="btn-open-x-report"]');
    await expect(xReportBtn).toBeVisible();
    await xReportBtn.click();

    // Verify non-destructive badge and report content
    await expect(page.locator('[data-testid="x-report-modal-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="x-report-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="x-report-meta"]')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('[data-testid="x-report-print-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="x-report-pdf-btn"]')).toBeVisible();

    // Close X-report modal
    await page.click('[data-testid="x-report-close-bottom-btn"]');
  });
});
