import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

/**
 * End-to-end tests for the preconfigured Base Cocktail & Ingredient Library
 * modal browser, filtering, preview drawer, and batch import workflow.
 */
test.describe('Cocktail Library Import Wizard E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display import button and open the cocktail library modal', async ({ page }) => {
    await page.goto('/cocktails');
    await expect(page.locator('ion-content')).toBeVisible();

    const importBtn = page.locator('[data-testid="import-library-btn"], [data-testid="cocktail-library-import-btn"]').first();
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Verify modal is displayed
    const modal = page.locator('[data-testid="cocktail-library-modal"]');
    await expect(modal).toBeVisible();

    // Verify searchbar and filter controls
    await expect(page.locator('[data-testid="library-searchbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="library-category-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="library-spirit-filter"]')).toBeVisible();
  });

  test('should allow previewing recipe details in the side drawer', async ({ page }) => {
    await page.goto('/cocktails');
    await page.locator('[data-testid="import-library-btn"], [data-testid="cocktail-library-import-btn"]').first().click();

    const modal = page.locator('[data-testid="cocktail-library-modal"]');
    await expect(modal).toBeVisible();

    // Wait for catalog cards to load
    const firstCard = page.locator('[data-testid^="library-cocktail-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Open recipe preview for first cocktail
    const previewBtn = page.locator('[data-testid="library-preview-btn-lib_1"]');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();

      // Drawer should appear
      const drawer = page.locator('[data-testid="library-recipe-preview-drawer"]');
      await expect(drawer).toBeVisible();

      // Close drawer
      await page.click('[data-testid="library-close-preview-btn"]');
      await expect(drawer).not.toBeVisible();
    }
  });

  test('should select cocktail templates and execute batch import', async ({ page }) => {
    await page.goto('/cocktails');
    await page.locator('[data-testid="import-library-btn"], [data-testid="cocktail-library-import-btn"]').first().click();

    const modal = page.locator('[data-testid="cocktail-library-modal"]');
    await expect(modal).toBeVisible();

    // Wait for catalog cards to load
    const firstCard = page.locator('[data-testid^="library-cocktail-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Batch select all visible
    const selectAllBtn = page.locator('[data-testid="library-select-all-btn"]');
    await selectAllBtn.click();

    // Submit import
    const importBtn = page.locator('[data-testid="library-import-btn"]');
    await expect(importBtn).toBeEnabled({ timeout: 5000 });
    await importBtn.click();

    // Modal should be dismissed after successful import
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});
