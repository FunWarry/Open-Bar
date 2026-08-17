import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Step-by-Step Modular Cocktail Builder & Live Scaling E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Authenticate as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should navigate through 4-step wizard and configure modular recipe blocks', async ({ page }) => {
    await page.goto('/cocktails/new');
    await page.waitForLoadState('networkidle');

    // 1. Verify Step 1: General Info is active
    await expect(page.locator('[data-testid="wizard-step-1-tab"]')).toHaveClass(/active/);
    await expect(page.locator('input[data-testid="cocktail-form-name-input"]')).toBeVisible();

    // Fill general fields
    await page.fill('input[data-testid="cocktail-form-name-input"]', 'Paloma Especial');
    await page.fill('input[data-testid="cocktail-form-price-input"]', '11.5');
    await page.click('[data-testid="cocktail-form-category-select-trigger"]');
    await page.click('[data-testid="cocktail-form-category-select-option-ALCOOLISE"]');
    await page.fill('input[data-testid="cocktail-form-description-input"]', 'Refreshing tequila and grapefruit cocktail');

    // 2. Navigate to Step 2: Recipe Blocks Builder
    await page.click('[data-testid="wizard-btn-next"]');
    await expect(page.locator('[data-testid="wizard-step-2-tab"]')).toHaveClass(/active/);

    // Add an Ingredient Block
    await page.click('[data-testid="btn-add-ingredient-block"]');
    await expect(page.locator('[data-testid="recipe-block-0"]')).toBeVisible();

    // Select ingredient & quantity
    await page.click('[data-testid="select-ingredient-0-trigger"]');
    await page.locator('[data-testid^="select-ingredient-0-option-"]').first().click();
    await page.fill('[data-testid="input-ingredient-qty-0"]', '5');

    // Add an Action Template Block
    await page.click('[data-testid="btn-add-template-block"]');
    await expect(page.locator('[data-testid="recipe-block-1"]')).toBeVisible();

    // Add a Custom Step Block
    await page.click('[data-testid="btn-add-custom-block"]');
    await expect(page.locator('[data-testid="recipe-block-2"]')).toBeVisible();
    await page.fill('[data-testid="input-custom-title-2"]', 'Flambage du zeste de pamplemousse');
    await page.fill('[data-testid="textarea-custom-desc-2"]', 'Exprimer les huiles essentielles au-dessus du verre');

    // Test moving block up
    await page.click('[data-testid="btn-move-up-2"]');

    // 3. Navigate to Step 3: Variants
    await page.click('[data-testid="wizard-btn-next"]');
    await expect(page.locator('[data-testid="wizard-step-3-tab"]')).toHaveClass(/active/);

    // 4. Navigate to Step 4: Interactive Live Scaling Preview
    await page.click('[data-testid="wizard-btn-next"]');
    await expect(page.locator('[data-testid="wizard-step-4-tab"]')).toHaveClass(/active/);

    // Verify portion scaler is at 1 verre by default
    await expect(page.locator('[data-testid="preview-portions-count"]')).toContainText('1');

    // Increment portions to 3 verres
    await page.click('[data-testid="btn-increment-portions"]');
    await page.click('[data-testid="btn-increment-portions"]');
    await expect(page.locator('[data-testid="preview-portions-count"]')).toContainText('3');

    // Decrement portions back to 2 verres
    await page.click('[data-testid="btn-decrement-portions"]');
    await expect(page.locator('[data-testid="preview-portions-count"]')).toContainText('2');

    // 5. Submit cocktail creation
    await page.click('[data-testid="cocktail-form-submit-btn"] button, [data-testid="cocktail-form-submit-btn"]');
    await page.waitForURL((url) => url.pathname === '/cocktails', { timeout: 10000 });
  });

  test('should allow creating a new reusable action template from the inline modal', async ({ page }) => {
    await page.goto('/cocktails/new');
    await page.waitForLoadState('networkidle');

    // Complete Step 1 first to enable wizard step 2
    await page.fill('input[data-testid="cocktail-form-name-input"]', 'Fumage Test');
    await page.fill('input[data-testid="cocktail-form-price-input"]', '12');
    await page.click('[data-testid="cocktail-form-category-select-trigger"]');
    await page.click('[data-testid="cocktail-form-category-select-option-ALCOOLISE"]');
    await page.click('[data-testid="wizard-btn-next"]');
    await expect(page.locator('[data-testid="wizard-step-2-tab"]')).toHaveClass(/active/);

    // Add a template block first to display inline "+ Nouveau modèle" button
    await page.click('[data-testid="btn-add-template-block"]');
    await expect(page.locator('[data-testid="recipe-block-0"]')).toBeVisible();

    // Open inline modal for creating a new template via trigger or button
    await page.click('[data-testid="btn-open-create-template-modal"]');
    await expect(page.locator('[data-testid="new-template-modal"]')).toBeVisible();

    // Fill modal form
    await page.fill('[data-testid="modal-template-name-input"]', 'Fumage au bois de chêne');
    await page.selectOption('[data-testid="modal-template-type-select"]', 'FLAME');
    await page.fill('[data-testid="modal-template-duration-input"]', '20');

    // Save template
    await page.click('[data-testid="modal-btn-save-template"]');
    await expect(page.locator('[data-testid="new-template-modal"]')).not.toBeVisible();
  });
});
