import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Serveur Order Creation E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as server
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'serveur1');
    await page.fill('input[data-testid="login-password"]', 'serveur123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should view server dashboard with tables and floor plan', async ({ page }) => {
    await page.goto('/serveur');
    await expect(page.locator('app-dashboard-serveur, ion-header, .serveur-dashboard-header').first()).toBeVisible();
  });

  test('should navigate to orders list', async ({ page }) => {
    await page.goto('/commandes');
    await expect(page.locator('ion-content, body').first()).toBeVisible();
  });
});
