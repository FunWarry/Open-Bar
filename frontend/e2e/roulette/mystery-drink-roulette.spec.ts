import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Mystery Drink Roulette & Theme Customization E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test.describe('Staff Profile & Theme Customization', () => {
    test.beforeEach(async ({ page }) => {
      // Authenticate as Staff (Server or Barman)
      await page.goto('/auth/login');
      await page.fill('input[data-testid="login-username"]', 'admin');
      await page.fill('input[data-testid="login-password"]', 'admin123');
      await page.click('button[data-testid="login-btn"]');
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    });

    test('should display profile with language dropdown, theme modes, and TV PIN', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();

      // Language selector should be visible
      await expect(page.locator('[data-testid="pref-select-language"]')).toBeVisible();

      // Theme mode buttons should be visible and functional
      await expect(page.locator('[data-testid="profile-theme-dark-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-theme-light-btn"]')).toBeVisible();
      await page.click('[data-testid="profile-theme-light-btn"]');
      await expect(page.locator('[data-testid="profile-theme-light-btn"]')).toHaveClass(/active/);

      // TV PIN card should be visible for staff
      await expect(page.locator('[data-testid="profile-roulette-pin-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-roulette-pin-value"]')).toHaveText('7777');
      await expect(page.locator('[data-testid="profile-copy-pin-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-regenerate-pin-btn"]')).toBeVisible();
    });

    test('should expand inline theme studio and access dedicated /theme page', async ({ page }) => {
      await page.goto('/profile');
      await page.click('[data-testid="profile-toggle-theme-studio-btn"]');
      await expect(page.locator('[data-testid="profile-inline-theme-studio"]')).toBeVisible();

      // Open dedicated /theme page
      await page.goto('/theme');
      await expect(page.locator('[data-testid="theme-customizer-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-preview-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="preset-theme-cyberpunk"]')).toBeVisible();

      // Select preset
      await page.click('[data-testid="preset-theme-cyberpunk"]');
      await expect(page.locator('[data-testid="preset-theme-cyberpunk"]')).toHaveClass(/active/);
    });
  });

  test.describe('Roulette TV Secondary Display Screen', () => {
    test('should require 4-digit PIN to unlock the live TV display', async ({ page }) => {
      await page.goto('/roulette-display');

      // PIN entry modal should be presented
      await expect(page.locator('[data-testid="tv-pin-modal"]')).toBeVisible();

      // Enter wrong PIN
      await page.fill('input[data-testid="tv-pin-digit-0"]', '1');
      await page.fill('input[data-testid="tv-pin-digit-1"]', '2');
      await page.fill('input[data-testid="tv-pin-digit-2"]', '3');
      await page.fill('input[data-testid="tv-pin-digit-3"]', '4');
      await page.click('[data-testid="tv-pin-submit-btn"]');
      await expect(page.locator('[data-testid="tv-pin-error"]')).toBeVisible();

      // Enter valid PIN 7777
      await page.fill('input[data-testid="tv-pin-digit-0"]', '7');
      await page.fill('input[data-testid="tv-pin-digit-1"]', '7');
      await page.fill('input[data-testid="tv-pin-digit-2"]', '7');
      await page.fill('input[data-testid="tv-pin-digit-3"]', '7');
      await page.click('[data-testid="tv-pin-submit-btn"]');

      // Wheel display container should now be unlocked
      await expect(page.locator('[data-testid="roulette-display-container"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="tv-pin-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Client Customer Self-Spin at Table QR', () => {
    test('should allow guest to spin mystery roulette wheel and add drink to cart at standard price', async ({ page }) => {
      await page.goto('/client/table/1');

      // Open Mystery Roulette modal
      const openRouletteBtn = page.locator('[data-testid="client-open-roulette-btn"]');
      if (await openRouletteBtn.isVisible()) {
        await openRouletteBtn.click();
        await expect(page.locator('[data-testid="roulette-modal"]')).toBeVisible();

        // Spin the wheel
        await page.click('[data-testid="roulette-spin-btn"]');

        // Spin outcome dialog reveals winning cocktail
        await expect(page.locator('[data-testid="roulette-win-dialog"]')).toBeVisible({ timeout: 8000 });
        await expect(page.locator('[data-testid="roulette-win-title"]')).toContainText('Mojito');

        // Add to cart at full price without discount (anti-fraud rule)
        await page.click('[data-testid="roulette-add-cart-btn"]');
        await expect(page.locator('[data-testid="roulette-modal"]')).not.toBeVisible();
      }
    });
  });

});
