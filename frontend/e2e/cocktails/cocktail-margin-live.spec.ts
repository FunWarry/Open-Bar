import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Gross Margin, COGS & Financial Health Live Tracking E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Authenticate as Admin / Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display live COGS, gross margin amounts and margin rate badges in cocktail wizard', async ({ page }) => {
    await page.goto('/cocktails/new');
    await page.waitForLoadState('networkidle');

    // Fill required fields in Step 1
    await page.fill('input[data-testid="cocktail-form-name-input"]', 'Paloma Especial');
    await page.fill('input[data-testid="cocktail-form-price-input"]', '12');
    await page.click('[data-testid="cocktail-form-category-select-trigger"]');
    await page.click('[data-testid="cocktail-form-category-select-option-ALCOOLISE"]');

    // Navigate to Step 2: Recipe blocks
    await page.click('[data-testid="wizard-btn-next"]');
    await expect(page.locator('[data-testid="wizard-step-2-tab"]')).toHaveClass(/active/);

    // Verify financial live bar is visible
    const financialBar = page.locator('[data-testid="live-recipe-cost-bar"]');
    await expect(financialBar).toBeVisible();

    // Add ingredient block
    await page.click('[data-testid="btn-add-ingredient-block"]');
    await expect(page.locator('[data-testid="recipe-block-0"]')).toBeVisible();

    // Check that recipe cost and gross margin indicators are rendered
    await expect(page.locator('[data-testid="live-recipe-cost-val"]')).toBeVisible();
    await expect(page.locator('[data-testid="live-margin-pill"]')).toBeVisible();
  });

  test('should allow configuring default VAT rate and gross margin alert thresholds in app settings', async ({ page }) => {
    await page.goto('/admin/settings?tab=currency');
    await page.waitForLoadState('networkidle');

    // Verify Currency & Margins panel is active
    await expect(page.locator('[data-testid="panel-currency"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-margins-vat-settings"]')).toBeVisible();

    // Check default VAT rate input
    const vatInput = page.locator('[data-testid="input-default-vat-rate"]');
    await expect(vatInput).toBeVisible();

    // Test clicking a VAT preset (Suisse 8.1%)
    const presetCH = page.locator('[data-testid="vat-preset-btn-CH"]');
    await expect(presetCH).toBeVisible();
    await presetCH.click();
    await expect(vatInput).toHaveValue('8.1');

    // Check target and warning margin inputs
    const targetMarginInput = page.locator('[data-testid="input-target-gross-margin"]');
    const warningMarginInput = page.locator('[data-testid="input-warning-gross-margin"]');
    await expect(targetMarginInput).toBeVisible();
    await expect(warningMarginInput).toBeVisible();

    // Verify live margin simulation preview card
    await expect(page.locator('[data-testid="card-margins-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="margin-preview-excellent"]')).toBeVisible();
    await expect(page.locator('[data-testid="margin-preview-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="margin-preview-critical"]')).toBeVisible();
  });

  test('should display live COGS, gross margin, and top profitable drinks on manager dashboard', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Verify Financial Health KPI stat cards
    await expect(page.locator('[data-testid="stat-card-cogs"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-card-gross-margin"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-card-margin-rate"]')).toBeVisible();

    // Verify Most Profitable Cocktails ranking card
    await expect(page.locator('[data-testid="card-profitable-cocktails"]')).toBeVisible();
  });
});
