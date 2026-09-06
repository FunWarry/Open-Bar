import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Serveur Offline Queue & Background Sync E2E (#361)', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Authenticate as serveur
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'serveur1');
    await page.fill('input[data-testid="login-password"]', 'serveur123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display offline banner when device goes offline', async ({ page }) => {
    await page.goto('/serveur');
    await expect(page.locator('app-dashboard-serveur, .dashboard-serveur-content').first()).toBeVisible({ timeout: 10000 });

    // Emulate network disconnection
    await page.context().setOffline(true);

    // Check that offline indicator bar appears
    await expect(page.locator('[data-testid="offline-indicator-bar"]')).toBeVisible({ timeout: 5000 });

    // Restore online
    await page.context().setOffline(false);
  });

  test('should queue order into IndexedDB when offline and sync when back online', async ({ page }) => {
    await page.goto('/serveur?tab=commande&tableId=1');

    // Wait for cart drawer and products to load
    await expect(page.locator('app-cart-drawer')).toBeVisible({ timeout: 10000 });

    // Emulate offline mode before placing order
    await page.context().setOffline(true);
    await expect(page.locator('[data-testid="offline-indicator-bar"]')).toBeVisible({ timeout: 5000 });

    // Add a cocktail to cart
    const productBtn = page.locator('.product-card').first();
    await expect(productBtn).toBeVisible({ timeout: 5000 });
    await productBtn.click({ force: true });

    // Handle variant selection if modal opens
    const variantBtn = page.locator('.variant-card-btn').first();
    if (await variantBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await variantBtn.click();
    }

    // Verify item is in cart
    await expect(page.locator('[data-testid="cart-item-0"], .cart-item-row').first()).toBeVisible({ timeout: 5000 });

    // Submit cart order offline
    await page.click('[data-testid="btn-submit-cart"]');

    // Verify pending offline count badge is displayed
    await expect(page.locator('[data-testid="offline-pending-count"]')).toBeVisible({ timeout: 5000 });

    // Restore online
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Verify background sync completes automatically and success toast displays
    await expect(page.locator('ion-toast.ion-color-success, ion-toast[color="success"]').first()).toBeVisible({ timeout: 10000 });

    // Verify offline indicator bar disappears once all pending items are synchronized
    await expect(page.locator('[data-testid="offline-indicator-bar"]')).toBeHidden({ timeout: 10000 });
  });
});
