import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Cloud Relay Reverse Tunnel, White-Label & Configurable Access', () => {
  test('should configure Cloud Relay, access matrix, and test diagnostics in Admin Settings', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    await page.goto('/admin/settings?tab=qr');

    const relayCard = page.locator('[data-testid="card-cloud-relay-settings"]');
    await expect(relayCard).toBeVisible();
    await expect(page.locator('[data-testid="badge-cloud-relay-state"]')).toContainText('SIMULATED');
    await expect(page.locator('[data-testid="cloud-relay-access-matrix"]')).toBeVisible();

    await page.locator('[data-testid="btn-cloud-relay-test"]').click();
    await expect(page.locator('[data-testid="cloud-relay-diagnostic-result"]')).toContainText('SIMULATED_OK');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
  });

  test('should expose per-user remoteAccessEnabled toggle in Admin User Management', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    await page.goto('/admin/users');
    await page.locator('button[data-testid="create-user-btn"]').click();
    await expect(page.locator('[data-testid="user-remote-access-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-user-remote-access"]')).toBeVisible();
  });

  test('should display white-label venue branding on patron QR ordering and offline fallback screen', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/client/commande');
    await expect(page.locator('[data-testid="white-label-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="white-label-venue-name"]')).toContainText('Le Shaker Paris');

    for (const vp of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/relay-offline');
      await expect(page.locator('[data-testid="tunnel-offline-fallback"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-venue-name"]')).toContainText('Le Shaker Paris');
      await expect(page.locator('[data-testid="fallback-wifi-ssid"]')).toContainText('LeShaker-Guest');
      await expect(page.locator('[data-testid="btn-retry-tunnel"]')).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBeFalsy();
    }
  });
});
