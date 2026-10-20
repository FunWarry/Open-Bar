import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('System OTA Update & Disaster Recovery Snapshots E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should navigate to system update hub and display version and health metrics', async ({ page }) => {
    // Navigate from admin dashboard action hub
    await page.goto('/admin');
    const updateAction = page.locator('[data-testid="admin-action-system-updates"]');
    await expect(updateAction).toBeVisible();
    await updateAction.click();

    await page.waitForURL('**/admin/system');
    await expect(page.locator('[data-testid="system-update-page"]')).toBeVisible();

    // Verify KPI Cards
    await expect(page.locator('[data-testid="kpi-current-version"]')).toContainText('v0.8.0');
    await expect(page.locator('[data-testid="kpi-health-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-disk-space"]')).toContainText('50.0 Go');
    await expect(page.locator('[data-testid="kpi-snapshots-count"]')).toBeVisible();
  });

  test('should allow switching between Stable and Beta release channels', async ({ page }) => {
    await page.goto('/admin/system');
    await expect(page.locator('[data-testid="system-update-page"]')).toBeVisible();

    const stableChip = page.locator('[data-testid="channel-stable"]');
    const betaChip = page.locator('[data-testid="channel-beta"]');

    await expect(stableChip).toBeVisible();
    await expect(betaChip).toBeVisible();

    // Switch to Beta channel
    await betaChip.click();
    await expect(betaChip).toHaveClass(/ion-color-primary/);

    // Switch back to Stable channel
    await stableChip.click();
    await expect(stableChip).toHaveClass(/ion-color-primary/);
  });

  test('should display available release banner, open pre-flight safety modal, and inspect safety checks', async ({ page }) => {
    await page.goto('/admin/system');
    await expect(page.locator('[data-testid="system-update-page"]')).toBeVisible();

    // Release banner with v0.8.1 should be rendered
    const banner = page.locator('[data-testid="banner-update-available"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('v0.8.1');

    // Launch Pre-flight button
    const preflightBtn = page.locator('[data-testid="btn-open-preflight"]');
    await expect(preflightBtn).toBeVisible();
    await preflightBtn.click();

    // Pre-flight modal is opened
    const preflightModal = page.locator('[data-testid="preflight-modal"]');
    await expect(preflightModal).toBeVisible();

    // Safety checks displayed
    await expect(page.locator('.preflight-checklist')).toBeVisible();

    // Close modal via cancel button
    const cancelBtn = page.locator('[data-testid="btn-cancel-preflight"]');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(preflightModal).not.toBeVisible();
  });

  test('should list disaster recovery snapshots and allow opening restore confirmation dialog', async ({ page }) => {
    await page.goto('/admin/system');
    await expect(page.locator('[data-testid="system-update-page"]')).toBeVisible();

    // Snapshots table
    const table = page.locator('[data-testid="card-snapshots"]');
    await expect(table).toBeVisible();

    const snapshotRow = page.locator('[data-testid="row-snapshot-openbar_pre_update_0.7.5_20261015_020000"]');
    await expect(snapshotRow).toBeVisible();

    // Open restore confirmation dialog
    const restoreBtn = page.locator('[data-testid="btn-restore-openbar_pre_update_0.7.5_20261015_020000"]');
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // Restore modal visible
    const restoreModal = page.locator('[data-testid="restore-modal"]');
    await expect(restoreModal).toBeVisible();

    // Dismiss modal
    const cancelRestoreBtn = page.locator('[data-testid="btn-cancel-restore"]');
    await expect(cancelRestoreBtn).toBeVisible();
    await cancelRestoreBtn.click();
    await expect(restoreModal).not.toBeVisible();
  });
});
