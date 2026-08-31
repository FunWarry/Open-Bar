import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

/**
 * End-to-End test suite for Table QR Code Generator and Batch Export (Ticket #364).
 */
test.describe('Table QR Code Generator and Export E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Login as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display QR batch generator button in tables list and open batch modal', async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('[data-testid="table-batch-qr-btn"]')).toBeVisible();

    // Click batch button
    await page.click('[data-testid="table-batch-qr-btn"]');
    await expect(page.locator('[data-testid="table-qr-batch-modal"]')).toBeVisible();

    // Verify layout options
    await expect(page.locator('[data-testid="layout-stand-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="layout-card-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="layout-sticker-btn"]')).toBeVisible();

    // Switch layout to CARD
    await page.click('[data-testid="layout-card-btn"]');
    await expect(page.locator('[data-testid="layout-card-btn"]')).toHaveClass(/selected/);

    // Close batch modal
    await page.click('[data-testid="close-batch-modal-btn"]');
    await expect(page.locator('[data-testid="table-qr-batch-modal"]')).not.toBeVisible();
  });

  test('should open individual QR modal from table card and copy URL', async ({ page }) => {
    await page.goto('/tables');
    const tableQrBtn = page.locator('[data-testid="table-card-qr-btn-1"]').first();
    await expect(tableQrBtn).toBeVisible();

    await tableQrBtn.click();
    await expect(page.locator('[data-testid="table-qr-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-qr-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-order-url-input"]')).toBeVisible();

    // Switch format between PNG and SVG
    await page.click('[data-testid="qr-format-svg-btn"]');
    await expect(page.locator('[data-testid="qr-format-svg-btn"]')).toHaveClass(/active/);

    // Close modal
    await page.click('[data-testid="close-qr-modal-btn"]');
    await expect(page.locator('[data-testid="table-qr-modal"]')).not.toBeVisible();
  });

  test('should configure QR client base URL and Wi-Fi credentials in app settings', async ({ page }) => {
    await page.goto('/manager/currency');
    await expect(page.locator('[data-testid="unified-app-settings-page"]').first()).toBeVisible();

    // Switch to QR tab
    await page.click('[data-testid="tab-qr"]');
    const clientBaseUrlInput = page.locator('[data-testid="input-client-base-url"] input, input[data-testid="input-client-base-url"]').first();
    await expect(clientBaseUrlInput).toBeVisible();
    await expect(page.locator('[data-testid="toggle-wifi-enabled"]')).toBeVisible();

    // Update Wi-Fi settings
    const ssidInput = page.locator('[data-testid="input-wifi-ssid"] input, input[data-testid="input-wifi-ssid"]').first();
    const passInput = page.locator('[data-testid="input-wifi-password"] input, input[data-testid="input-wifi-password"]').first();

    await ssidInput.fill('OpenBar-VIP');
    await passInput.fill('SecretPass2026');

    // Check live preview updates
    await expect(page.locator('[data-testid="preview-stand-ssid"]')).toContainText('OpenBar-VIP');

    // Save settings
    await page.click('[data-testid="btn-save-all-settings"]');
  });
});
