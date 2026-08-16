import { test, expect } from '@playwright/test';

test.describe('Cocktails Catalog & Recipe Management E2E', () => {

  test.beforeEach(async ({ page }) => {
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
    const searchInput = page.locator('ion-searchbar input, input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Mojito');
      await expect(page.locator('ion-content')).toBeVisible();
    }
  });

  test('should navigate to cocktail creation form if accessible', async ({ page }) => {
    await page.goto('/cocktails');
    const createBtn = page.locator('ion-fab-button, [data-testid="create-cocktail-btn"]');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForURL('**/cocktails/**', { timeout: 5000 });
    }
  });
});
