import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Barman Rapid Waste & Tasting Quick-Log E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as barman
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'barman1');
    await page.fill('input[data-testid="login-password"]', 'barman123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should open quick-log modal, filter speed rail items, and close it', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content').first()).toBeVisible();

    // Verify quick-log button exists and click it
    const quickLogBtn = page.locator('[data-testid="open-quick-waste-btn"]');
    await expect(quickLogBtn).toBeVisible({ timeout: 5000 });
    await quickLogBtn.click();

    // Verify modal is displayed
    const closeBtn = page.locator('[data-testid="quick-waste-close-btn"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    // Category filter chips should be visible
    const allChip = page.locator('[data-testid="filter-chip-all"]');
    await expect(allChip).toBeVisible();
    await allChip.click();

    // Close the modal
    await closeBtn.click();
    await expect(closeBtn).not.toBeVisible({ timeout: 5000 });
  });

  test('should execute 2-tap quick-log and present 10-second undo toast', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content').first()).toBeVisible();

    // 1. Open quick-log modal
    const quickLogBtn = page.locator('[data-testid="open-quick-waste-btn"]');
    await expect(quickLogBtn).toBeVisible({ timeout: 5000 });
    await quickLogBtn.click();

    // 2. Select ingredient (Tap 1)
    const ingredientCard = page.locator('[data-testid="speed-rail-item-1"]');
    await expect(ingredientCard).toBeVisible({ timeout: 5000 });
    await ingredientCard.click();

    // 3. Verify action panel opened
    const actionPanel = page.locator('[data-testid="quick-waste-action-panel"]');
    await expect(actionPanel).toBeVisible({ timeout: 3000 });

    // 4. Select reason
    const reasonBtn = page.locator('[data-testid="reason-btn-ERREUR_PREPARATION"]');
    await expect(reasonBtn).toBeVisible();
    await reasonBtn.click();

    // 5. Tap standard dose preset (Tap 2 - triggers atomic decrement and dismisses)
    const dosePresetBtn = page.locator('[data-testid="dose-preset-standard"]');
    await expect(dosePresetBtn).toBeVisible();
    await dosePresetBtn.click();

    // 6. Verify modal is dismissed and 10-second undo toast appears
    await expect(actionPanel).not.toBeVisible({ timeout: 5000 });
    const toast = page.locator('ion-toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should support custom stepper quantity toggle', async ({ page }) => {
    await page.goto('/barman');
    await expect(page.locator('ion-content').first()).toBeVisible();

    const quickLogBtn = page.locator('[data-testid="open-quick-waste-btn"]');
    await expect(quickLogBtn).toBeVisible({ timeout: 5000 });
    await quickLogBtn.click();

    // Select ingredient
    const ingredientCard = page.locator('[data-testid="speed-rail-item-1"]');
    await expect(ingredientCard).toBeVisible({ timeout: 5000 });
    await ingredientCard.click();

    // Toggle custom stepper
    const toggleStepperBtn = page.locator('[data-testid="toggle-custom-stepper-btn"]');
    await expect(toggleStepperBtn).toBeVisible();
    await toggleStepperBtn.click();

    // Stepper container and submit button should be visible
    const stepper = page.locator('[data-testid="custom-stepper-container"]');
    await expect(stepper).toBeVisible();
    const submitBtn = page.locator('[data-testid="custom-qty-submit-btn"]');
    await expect(submitBtn).toBeVisible();

    // Submit custom quantity
    await submitBtn.click();

    // Toast should appear
    const toast = page.locator('ion-toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
