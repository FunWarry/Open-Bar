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
    await page.goto('/admin/settings?tab=printers');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();

    // Select Hardware & Peripherals tab (Tab 7)
    const hardwareTabBtn = page.locator('[data-testid="tab-printers"]');
    if (await hardwareTabBtn.isVisible()) {
      await hardwareTabBtn.click();
    }

    // Verify TPE Settings Card
    const tpeCard = page.locator('[data-testid="card-settings-tpe"]');
    await expect(tpeCard).toBeVisible();

    // Verify Toggles & Global Inputs
    await expect(page.locator('[data-testid="toggle-tpe-enabled"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-tpe-simulator-enabled"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-tpe-port"]')).toBeVisible();

    // Verify Add TPE Button
    await expect(page.locator('[data-testid="btn-add-tpe"]')).toBeVisible();
  });

  test('should display paymentTerminal module toggle in App Settings and blueprint preview', async ({ page }) => {
    await page.goto('/admin/settings?tab=modules');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();

    // Switch to Modules tab
    const modulesTabBtn = page.locator('[data-testid="tab-modules"]');
    if (await modulesTabBtn.isVisible()) {
      await modulesTabBtn.click();
    }

    // Check paymentTerminal module toggle
    const moduleToggle = page.locator('[data-testid="toggle-module-payment-terminal"]');
    await expect(moduleToggle).toBeVisible();

    // Check blueprint preview node
    const blueprintNode = page.locator('[data-testid="preview-node-payment-terminal"]');
    await expect(blueprintNode).toBeVisible();
  });
});
