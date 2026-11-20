import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Hybrid DRM Licensing Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should navigate from Admin Hub to /admin/license and inspect diagnostics & module entitlements', async ({ page }) => {
    await page.goto('/admin');
    const licenseAction = page.locator('[data-testid="admin-action-license"]');
    await expect(licenseAction).toBeVisible();
    await licenseAction.click();

    await page.waitForURL('**/admin/license');
    await expect(page.locator('[data-testid="license-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-license-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-license-plan"]')).toContainText('ENTERPRISE');
    await expect(page.locator('[data-testid="venue-establishment-id"]')).toContainText('73282932000074');
    await expect(page.locator('[data-testid="license-module-FLOOR_PLAN"]')).toBeVisible();
  });

  test('should activate offline JWT license key and handle air-gapped sync gracefully', async ({ page }) => {
    await page.goto('/admin/license');
    await expect(page.locator('[data-testid="offline-activation-card"]')).toBeVisible();

    const textarea = page.locator('[data-testid="input-offline-license-token"] textarea');
    await textarea.fill('eyJhbGciOiJFUzI1NiJ9.eyJlc3RhYmxpc2htZW50SWQiOiI3MzI4MjkzMjAwMDA3NCIsInBsYW4iOiJQUk8ifQ.signature123');

    await page.locator('[data-testid="btn-activate-offline-license"]').click();
    await expect(page.locator('[data-testid="kpi-license-plan"]')).toContainText('PRO');

    await page.locator('[data-testid="btn-sync-license-online"]').click();
    await expect(page.locator('[data-testid="license-sync-feedback"]')).toContainText('offline mode');
  });

  test('should display global expired banner and keep historical invoices accessible on mobile and desktop', async ({ page }) => {
    await page.route('**/api/admin/license/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'EXPIRED',
          plan: 'PRO',
          expiresAt: '2026-11-10T00:00:00Z',
          graceEndsAt: '2026-11-12T00:00:00Z',
          graceHoursRemaining: 0,
          orderCreationAllowed: false,
          enforced: true,
        }),
      });
    });

    await page.goto('/app-home');
    const banner = page.locator('[data-testid="license-global-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveClass(/tone-expired/);

    // Historical invoices remain accessible even when license is expired
    await page.locator('[data-testid="license-banner-invoices-btn"]').click();
    await page.waitForURL('**/factures');
  });
});
