import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Barman Kanban E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as barman
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'barman1');
    await page.fill('input[data-testid="login-password"]', 'barman123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display barman kanban dashboard', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should open recipe side panel, toggle view modes, and close it', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content')).toBeVisible();

    // Locate and click recipe toggle button on order item
    const recipeBtn = page.locator('button[data-testid="toggle-recipe-btn"]').first();
    if (await recipeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recipeBtn.click();

      // Side panel should become visible
      const sidePanel = page.locator('[data-testid="recipe-side-panel"]');
      await expect(sidePanel).toBeVisible({ timeout: 5000 });

      // Check view mode switch to compact
      const compactBtn = page.locator('[data-testid="btn-view-mode-compact"]');
      await expect(compactBtn).toBeVisible();
      await compactBtn.click();
      await expect(page.locator('[data-testid="recipe-modular-steps-section"]')).toBeVisible();

      // Check switch back to full
      const fullBtn = page.locator('[data-testid="btn-view-mode-full"]');
      await expect(fullBtn).toBeVisible();
      await fullBtn.click();

      // Close the panel
      const closeBtn = page.locator('[data-testid="btn-close-recipe-panel"]');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
    }
  });

  test('should open quick stock / ruptures modal and verify content is visible with non-zero height', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content').first()).toBeVisible();

    // Click on "Ruptures à chaud" button
    const rupturesBtn = page.locator('[data-testid="open-ruptures-btn"]');
    await expect(rupturesBtn).toBeVisible({ timeout: 5000 });
    await rupturesBtn.click();

    // Verify modal is visible
    const modal = page.locator('ion-modal.ruptures-modal-container');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify segments exist and content inside modal is rendered (not collapsed to 0)
    const cocktailsSegment = page.locator('[data-testid="segment-cocktails"]');
    await expect(cocktailsSegment).toBeVisible();

    const searchBar = page.locator('[data-testid="ruptures-searchbar"]');
    await expect(searchBar).toBeVisible();

    // Verify the scrollable content inside the modal has non-zero height
    const rupturesContent = page.locator('ion-modal.ruptures-modal-container ion-content');
    await expect(rupturesContent).toBeVisible();
    const boundingBox = await rupturesContent.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.height).toBeGreaterThan(100);

    // Switch to ingredients tab
    const ingredientsSegment = page.locator('[data-testid="segment-ingredients"]');
    await ingredientsSegment.click();
    await expect(ingredientsSegment).toBeVisible();

    // Close modal
    const closeBtn = page.locator('ion-modal.ruptures-modal-container ion-buttons ion-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
