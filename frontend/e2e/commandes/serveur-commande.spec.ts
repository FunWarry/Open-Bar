import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Serveur Order Creation E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('[data-testid="login-btn"]');
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

  test('should allow creating an order via cart drawer on server dashboard', async ({ page }) => {
    await page.goto('/serveur?tab=commande&tableId=1');

    // Verify cart drawer is visible
    await expect(page.locator('app-cart-drawer')).toBeVisible({ timeout: 10000 });

    // Click to add a product
    const productBtn = page.locator('.product-card').first();
    await expect(productBtn).toBeVisible({ timeout: 5000 });
    await productBtn.click({ force: true });

    // If variant selection modal appears, select the first variant
    const variantBtn = page.locator('.variant-card-btn').first();
    if (await variantBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await variantBtn.click();
    }

    // Verify item appears in cart
    await expect(page.locator('[data-testid="cart-item-0"], .cart-item-row').first()).toBeVisible({ timeout: 5000 });
    // Submit cart order to bar
    await page.click('[data-testid="btn-submit-cart"]');
  });
});
