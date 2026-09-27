import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Physical Inventory Audit & Variance Matrix E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display inventory audit sessions list with KPI cards and filters', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify 4 financial KPI stat cards
    await expect(page.locator('[data-testid="stat-total-audits"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-active-audits"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-shrinkage-loss"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-surplus-gain"]')).toBeVisible();

    // Verify filter segment
    await expect(page.locator('[data-testid="segment-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="segment-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="segment-finalized"]')).toBeVisible();

    // Verify session card in list
    await expect(page.locator('[data-testid="session-card-1"]')).toBeVisible();
    await expect(page.locator('text=INV-2026-001')).toBeVisible();
    await expect(page.locator('text=Inventaire Mensuel Alcools')).toBeVisible();
  });

  test('should open new audit modal, validate fields, and cancel', async ({ page }) => {
    await page.goto('/inventory');

    // Click new audit button
    await page.click('[data-testid="btn-new-audit"]');

    // Verify modal is open
    await expect(page.locator('[data-testid="input-audit-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-location-scope"]')).toBeVisible();

    // Cancel modal
    await page.click('[data-testid="btn-cancel-modal"]');
    await expect(page.locator('[data-testid="input-audit-title"]')).not.toBeVisible();
  });

  test('should navigate to counting sheet, switch tabs and display variance metrics', async ({ page }) => {
    await page.goto('/inventory/1');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify header information
    await expect(page.locator('text=INV-2026-001')).toBeVisible();
    await expect(page.locator('text=Inventaire Mensuel Alcools')).toBeVisible();

    // Verify segment buttons
    await expect(page.locator('[data-testid="tab-counting"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-report"]')).toBeVisible();

    // Verify storage location tabs on counting sheet
    await expect(page.locator('[data-testid="loc-tab-main-bar"]')).toBeVisible();

    // Verify ingredient rows
    await expect(page.locator('[data-testid="sheet-row-10"]')).toBeVisible();
    await expect(page.locator('text=Rhum Blanc')).toBeVisible();

    // Switch to Report & Shrinkage tab
    await page.click('[data-testid="tab-report"]');

    // Verify Financial KPIs on report tab
    await expect(page.locator('[data-testid="kpi-net-variance"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-shrinkage-loss"]')).toBeVisible();

    // Verify variance table
    await expect(page.locator('[data-testid="table-variance-matrix"]')).toBeVisible();

    // Switch back to counting sheet
    await page.click('[data-testid="tab-counting"]');
    await expect(page.locator('[data-testid="sheet-row-10"]')).toBeVisible();
  });

  test('should open finalize confirmation modal and close it', async ({ page }) => {
    await page.goto('/inventory/1');

    // Open finalize modal
    await page.click('[data-testid="btn-open-finalize-modal"]');
    await expect(page.locator('[data-testid="btn-confirm-finalize"]')).toBeVisible();

    // Cancel modal
    await page.click('[data-testid="btn-cancel-finalize"]');
    await expect(page.locator('[data-testid="btn-confirm-finalize"]')).not.toBeVisible();
  });
});
