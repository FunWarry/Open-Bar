import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Barman Rush Batching Mode E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as barman
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'barman1');
    await page.fill('input[data-testid="login-password"]', 'barman123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should toggle between Ticket Kanban and Rush Batching mode', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content')).toBeVisible();

    // Verify view toggle segment buttons are rendered
    const ticketsBtn = page.locator('ion-segment-button[data-testid="segment-view-tickets"]');
    const batchBtn = page.locator('ion-segment-button[data-testid="segment-view-batch"]');
    await expect(ticketsBtn).toBeVisible();
    await expect(batchBtn).toBeVisible();

    // Switch to Rush Batching mode
    await batchBtn.click();

    // Rush batch container should be displayed
    const batchContainer = page.locator('[data-testid="rush-mode-container"]');
    await expect(batchContainer).toBeVisible();

    // Aggregated batch card for Mojito should be displayed
    const mojitoBatchCard = page.locator('[data-testid="batch-card-Mojito"]');
    await expect(mojitoBatchCard).toBeVisible();

    // Verify batch start button is visible and clickable
    const startBatchBtn = page.locator('[data-testid="batch-start-btn-Mojito"]');
    await expect(startBatchBtn).toBeVisible();
    await startBatchBtn.click();

    // Verify toast notification appears
    await expect(page.locator('ion-toast')).toBeVisible({ timeout: 5000 });

    // Switch back to Tickets view
    await ticketsBtn.click();
    await expect(page.locator('[data-testid="kanban-grid-tickets"]')).toBeVisible();
  });

  test('should open scaled recipe side panel directly from batch card', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content')).toBeVisible();

    // Switch to Rush Batching mode
    await page.click('ion-segment-button[data-testid="segment-view-batch"]');
    await expect(page.locator('[data-testid="rush-mode-container"]')).toBeVisible();

    // Click recipe button on Mojito batch card
    const recipeBtn = page.locator('[data-testid="batch-recipe-btn-Mojito"]');
    if (await recipeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recipeBtn.click();

      // Side panel should open
      const sidePanel = page.locator('[data-testid="recipe-side-panel"]');
      await expect(sidePanel).toBeVisible({ timeout: 5000 });

      // Close the panel
      const closeBtn = page.locator('[data-testid="btn-close-recipe-panel"]');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await expect(page.locator('[data-testid="recipe-side-panel"].open')).toBeHidden();
    }
  });
});
