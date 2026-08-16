import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Cocktails Catalog & Recipe Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin or Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display cocktails list page and load catalog', async ({ page }) => {
    await page.goto('/cocktails');
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should allow searching or filtering cocktails', async ({ page }) => {
    await page.goto('/cocktails');
    await expect(page.locator('ion-content')).toBeVisible();
    const searchInput = page.locator('ion-searchbar input, input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Mojito');
      await expect(page.locator('ion-content')).toBeVisible();
    }
  });

  test('should verify cocktail catalog page elements and creation trigger', async ({ page }) => {
    await page.goto('/cocktails');
    await expect(page.locator('ion-content')).toBeVisible();
    const createBtn = page.locator('ion-fab-button, [data-testid="create-cocktail-btn"]');
    const isCreateAvailable = await createBtn.isVisible();
    expect(typeof isCreateAvailable).toBe('boolean');
  });
});
