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

  test('should trigger rupture impact modal when setting ingredient stock to zero and allow cascade to cocktails', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content').first()).toBeVisible();

    // Click on "Ruptures à chaud" button
    const rupturesBtn = page.locator('[data-testid="open-ruptures-btn"]');
    await expect(rupturesBtn).toBeVisible({ timeout: 5000 });
    await rupturesBtn.click();

    // Wait for ruptures modal
    const rupturesModal = page.locator('ion-modal.ruptures-modal-container');
    await expect(rupturesModal).toBeVisible({ timeout: 5000 });

    // Switch to ingredients tab
    const ingredientsSegment = page.locator('[data-testid="segment-ingredients"]');
    await ingredientsSegment.click();
    await expect(ingredientsSegment).toBeVisible();

    // Click on the 0 (rupture) button for an ingredient
    const zeroBtn = page.locator('[data-testid="btn-rupture-zero"]').first();
    await expect(zeroBtn).toBeVisible({ timeout: 5000 });
    await zeroBtn.click();

    // Impact modal should open to display affected cocktails
    const impactModal = page.locator('ion-modal.rupture-impact-modal-container');
    await expect(impactModal).toBeVisible({ timeout: 5000 });

    // Verify ingredient details in impact modal
    const ingredientNom = page.locator('[data-testid="rupture-impact-ingredient-nom"]');
    await expect(ingredientNom).toBeVisible();

    // Verify confirm cascade button is present and click it
    const cascadeBtn = page.locator('[data-testid="rupture-confirm-cascade-btn"]');
    await expect(cascadeBtn).toBeVisible();
    await cascadeBtn.click();

    // Impact modal should dismiss after cascading
    await expect(impactModal).not.toBeVisible({ timeout: 5000 });

    // Close main ruptures modal
    const closeBtn = page.locator('ion-modal.ruptures-modal-container ion-buttons ion-button');
    await closeBtn.click();
    await expect(rupturesModal).not.toBeVisible();
  });
});

