import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Dual-Tier TPE Payment Monetization & Commission Ledger', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display Option 1 & Option 3 commissions, verify SHA-256 chain, and export monthly Z-proof on /admin/license', async ({ page }) => {
    await page.goto('/admin/license');

    const section = page.locator('[data-testid="monetization-section"]');
    await expect(section).toBeVisible();
    await expect(page.locator('[data-testid="kpi-monetization-option1"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-monetization-option3"]')).toBeVisible();
    await expect(page.locator('[data-testid="monetization-grace-callout"]')).toBeVisible();

    await page.locator('[data-testid="btn-verify-ledger"]').click();
    await expect(page.locator('[data-testid="monetization-tip-hash"]')).toContainText('a1b2c3d4');

    await page.locator('[data-testid="btn-export-monthly-proof"]').click();
    await page.locator('[data-testid="btn-sync-commissions"]').click();
    await expect(page.locator('[data-testid="monetization-sync-feedback"]')).toContainText('Stripe Billing');
  });

  test('should show pending commission grace warning banner and TPE mode config in Admin Settings without horizontal overflow', async ({ page }) => {
    await page.goto('/admin/settings?tab=printers');

    await expect(page.locator('[data-testid="settings-commission-grace-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-tpe-monetization-mode"]')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
  });
});
