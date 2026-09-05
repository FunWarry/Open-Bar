import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Client Call Waiter & Request Bill Alerts E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should display call waiter action buttons on client ordering view', async ({ page }) => {
    // Navigate with table parameter directly into menu
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    // Wait for the client actions bar
    const callWaiterBtn = page.locator('[data-testid="btn-call-waiter"]');
    const requestBillBtn = page.locator('[data-testid="btn-request-bill"]');

    await expect(callWaiterBtn).toBeVisible({ timeout: 5000 });
    await expect(requestBillBtn).toBeVisible({ timeout: 5000 });
  });

  test('should trigger waiter assistance call and display cooldown timer', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const callWaiterBtn = page.locator('[data-testid="btn-call-waiter"]');
    await expect(callWaiterBtn).toBeVisible({ timeout: 5000 });

    // Click call waiter button
    await callWaiterBtn.click();

    // Verify active call badge
    const statusBadge = page.locator('[data-testid="call-status-badge"]');
    await expect(statusBadge).toBeVisible({ timeout: 5000 });
  });

  test('should trigger bill request alert and display active addition status', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const requestBillBtn = page.locator('[data-testid="btn-request-bill"]');
    await expect(requestBillBtn).toBeVisible({ timeout: 5000 });

    // Click request bill button
    await requestBillBtn.click();

    // Verify active call badge
    const statusBadge = page.locator('[data-testid="call-status-badge"]');
    await expect(statusBadge).toBeVisible({ timeout: 5000 });
  });
});
