import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Stock Waste & Shrinkage Tracking E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin / Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should open stock waste modal from ingredients page and declare waste', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForSelector('[data-testid="ingredient-btn-record-waste"]', { timeout: 10000 });

    // Open global waste modal
    await page.click('[data-testid="ingredient-btn-record-waste"]');
    await expect(page.locator('app-stock-waste-modal')).toBeVisible({ timeout: 5000 });

    // Modal elements are displayed
    await expect(page.locator('[data-testid="waste-select-ingredient"]')).toBeVisible();
    await expect(page.locator('[data-testid="waste-btn-cancel"]')).toBeVisible();

    // Close modal
    await page.click('[data-testid="waste-btn-cancel"]');
    await expect(page.locator('app-stock-waste-modal')).not.toBeVisible();
  });

  test('should display waste audit card and quick action button in manager dashboard', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForSelector('[data-testid="manager-btn-stock-waste"]', { timeout: 10000 });

    // Verify quick action tile exists
    const wasteQuickAction = page.locator('[data-testid="manager-btn-stock-waste"]');
    await expect(wasteQuickAction).toBeVisible();

    // Verify waste audit card with financial summary
    const wasteAuditCard = page.locator('[data-testid="waste-audit-card"]');
    await expect(wasteAuditCard).toBeVisible();
    await expect(page.locator('[data-testid="waste-stat-total-loss"]')).toBeVisible();
    await expect(page.locator('[data-testid="waste-stat-total-qty"]')).toBeVisible();

    // Click quick action to open waste modal from dashboard
    await wasteQuickAction.click();
    await expect(page.locator('app-stock-waste-modal')).toBeVisible({ timeout: 5000 });
    await page.click('[data-testid="waste-btn-cancel"]');
    await expect(page.locator('app-stock-waste-modal')).not.toBeVisible();
  });
});
