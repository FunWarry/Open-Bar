import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Collaborative Table Cart E2E', () => {

  test('should prompt for guest nickname on first table scan and allow nickname modification', async ({ page }) => {
    await setupMockApi(page);

    // Navigate to table 1 with active session token
    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    // Nickname modal should be visible
    const modal = page.locator('[data-testid="nickname-modal"]');
    await expect(modal).toBeVisible();

    // Type nickname "Alex" and submit
    await page.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alex');
    await page.click('[data-testid="btn-save-guest-nickname"]');

    // Modal should disappear
    await expect(modal).not.toBeVisible();

    // Menu should be visible with table 1
    await expect(page.locator('.menu-title')).toBeVisible();

    // Guest badge should display "Alex"
    const badge = page.locator('[data-testid="badge-guest-name"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Alex');

    // Clicking guest badge reopens nickname prompt for editing
    await badge.click();
    await expect(page.locator('[data-testid="nickname-modal"]')).toBeVisible();

    // Update nickname to "Alexandre"
    await page.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alexandre');
    await page.click('[data-testid="btn-save-guest-nickname"]');
    await expect(page.locator('[data-testid="nickname-modal"]')).not.toBeVisible();
    await expect(badge).toContainText('Alexandre');
  });

  test('should add cocktail to collaborative cart and display floating summary bar', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    // Fill nickname
    await page.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alex');
    await page.click('[data-testid="btn-save-guest-nickname"]');
    await expect(page.locator('[data-testid="nickname-modal"]')).not.toBeVisible();

    // Click add button on first cocktail (Mojito)
    const mojitoCard = page.locator('[data-testid="product-card-1"]');
    await expect(mojitoCard).toBeVisible();
    await mojitoCard.locator('[data-testid="product-card-plus"]').click();

    // Floating cart bar should appear
    const floatingBar = page.locator('[data-testid="floating-cart-bar"]');
    await expect(floatingBar).toBeVisible();
    await expect(page.locator('[data-testid="btn-view-recap"]')).toBeVisible();

    // Click view recap button
    await page.click('[data-testid="btn-view-recap"]');

    // Shared cart recap view should be visible
    const recapView = page.locator('[data-testid="shared-cart-recap"]');
    await expect(recapView).toBeVisible();

    // Submitting order button should be present
    const submitBtn = page.locator('[data-testid="btn-submit-shared-order"]');
    await expect(submitBtn).toBeVisible();

    // Submit the table cart
    await submitBtn.click();

    // Should navigate to tracking view
    await expect(page).toHaveURL(/\/client\/suivi\/\d+/);
  });

  test('should support multi-guest collaborative table session across distinct contexts', async ({ browser }) => {
    // Context 1: Guest "Alex"
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await setupMockApi(page1);

    await page1.goto('/client/commande?table=1&token=active-mock-session-token');
    await page1.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alex');
    await page1.click('[data-testid="btn-save-guest-nickname"]');
    await expect(page1.locator('[data-testid="badge-guest-name"]')).toContainText('Alex');

    // Context 2: Guest "Sam"
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await setupMockApi(page2);

    await page2.goto('/client/commande?table=1&token=active-mock-session-token');
    await page2.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Sam');
    await page2.click('[data-testid="btn-save-guest-nickname"]');
    await expect(page2.locator('[data-testid="badge-guest-name"]')).toContainText('Sam');

    // Both guests can independently interact with the table menu
    await expect(page1.locator('.menu-title')).toBeVisible();
    await expect(page2.locator('.menu-title')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
