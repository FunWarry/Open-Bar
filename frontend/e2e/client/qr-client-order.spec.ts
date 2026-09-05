import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Client QR Code Self-Service Order E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should display client ordering view without authentication', async ({ page }) => {
    // Navigate directly to public client QR route
    await page.goto('/client/commande');
    await expect(page.locator('ion-content, body')).toBeVisible();
  });

  test('should access table menu with active session token', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=active-mock-session-token');
    await expect(page.locator('.menu-title')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-card"]')).not.toBeVisible();
  });

  test('should display expired session card and allow refresh when session is expired', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=expired-token');
    await expect(page.locator('[data-testid="session-expired-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-contact-server"]')).toBeVisible();

    // Click refresh session button
    await page.click('[data-testid="btn-refresh-session"]');
    await expect(page.locator('[data-testid="session-expired-card"]')).not.toBeVisible();
    await expect(page.locator('.menu-title')).toBeVisible();
  });
});
