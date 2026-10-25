import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Angel Shot Patron Safety Protocol E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('openbar_guest_name', 'Camille');
    });

    // Mock public safety alerts endpoint
    await page.route('**/api/public/safety-alerts/tables/**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 42,
          tableId: 1,
          tableNumero: 1,
          type: 'ANGEL_SHOT_ICE',
          typeLabel: 'Avec glaçons',
          status: 'ACTIVE',
          comment: 'Need ride escort',
          createdAt: new Date().toISOString()
        })
      });
    });
  });

  test('should display discreet Angel Shot assistance trigger in table menu header', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const safetyTriggerBtn = page.locator('[data-testid="btn-angel-shot-trigger"]');
    await expect(safetyTriggerBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open Angel Shot modal and display the three discreet assistance variants', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const safetyTriggerBtn = page.locator('[data-testid="btn-angel-shot-trigger"]');
    await safetyTriggerBtn.click();

    const neatVariant = page.locator('[data-testid="variant-card-angel_shot_neat"]');
    const iceVariant = page.locator('[data-testid="variant-card-angel_shot_ice"]');
    const limeVariant = page.locator('[data-testid="variant-card-angel_shot_lime"]');

    await expect(neatVariant).toBeVisible({ timeout: 5000 });
    await expect(iceVariant).toBeVisible({ timeout: 5000 });
    await expect(limeVariant).toBeVisible({ timeout: 5000 });
  });

  test('should trigger silent emergency assistance and display confirmation view', async ({ page }) => {
    await page.goto('/client/commande?table=1');
    await page.waitForLoadState('networkidle');

    const safetyTriggerBtn = page.locator('[data-testid="btn-angel-shot-trigger"]');
    await safetyTriggerBtn.click();

    const noteInput = page.locator('[data-testid="input-safety-note"] input');
    if (await noteInput.isVisible()) {
      await noteInput.fill('Please escort me to my car');
    }

    const iceVariant = page.locator('[data-testid="variant-card-angel_shot_ice"]');
    await iceVariant.click();

    // Verify confirmation view is displayed
    const confirmationView = page.locator('[data-testid="safety-confirmation-view"]');
    await expect(confirmationView).toBeVisible({ timeout: 5000 });

    // Dismiss confirmation
    const dismissBtn = page.locator('[data-testid="btn-dismiss-safety-confirmation"]');
    await dismissBtn.click();

    await expect(confirmationView).toBeHidden({ timeout: 5000 });
  });
});
