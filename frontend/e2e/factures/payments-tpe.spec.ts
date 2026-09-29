import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Payment Terminal (TPE) Integration E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as manager / admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display TPE settings card and allow connectivity diagnostic test', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.locator('ion-content')).toBeVisible();

    // Select Hardware & Peripherals tab (Tab 7)
    const hardwareTabBtn = page.locator('[data-testid="tab-materiel"]');
    if (await hardwareTabBtn.isVisible()) {
      await hardwareTabBtn.click();
    }

    // Verify TPE Settings Card
    const tpeCard = page.locator('[data-testid="settings-tpe-card"]');
    await expect(tpeCard).toBeVisible();

    // Verify Station Inputs
    await expect(page.locator('[data-testid="input-tpe-bar-ip"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-tpe-floor-ip"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-tpe-port"]')).toBeVisible();

    // Test TPE Bar Connection Button
    const testBarBtn = page.locator('[data-testid="btn-test-tpe-bar"]');
    await expect(testBarBtn).toBeVisible();
    await testBarBtn.click();

    // Verify test feedback badge or toast appears
    await expect(page.locator('[data-testid="badge-tpe-test-bar"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display paymentTerminal module toggle in App Settings and blueprint preview', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.locator('ion-content')).toBeVisible();

    // Switch to Modules tab
    const modulesTabBtn = page.locator('[data-testid="tab-modules"]');
    if (await modulesTabBtn.isVisible()) {
      await modulesTabBtn.click();
    }

    // Check paymentTerminal module toggle
    const moduleToggle = page.locator('[data-testid="toggle-module-payment-terminal"]');
    await expect(moduleToggle).toBeVisible();

    // Check blueprint preview node
    const blueprintNode = page.locator('[data-testid="blueprint-node-paymentTerminal"]');
    await expect(blueprintNode).toBeVisible();
  });
});
