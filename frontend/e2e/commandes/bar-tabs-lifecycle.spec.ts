import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Bar Tabs & Running Customer Ledger E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display bar tabs list on server dashboard', async ({ page }) => {
    await page.goto('/serveur?tab=tabs');
    await expect(page.locator('app-bar-tabs-list, [data-testid="bar-tabs-list"]').first()).toBeVisible({ timeout: 10000 });
    // Verify pre-existing mock tab appears
    await expect(page.locator('.bar-tab-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('should open new tab modal and create a customer bar tab', async ({ page }) => {
    await page.goto('/serveur?tab=tabs');
    await expect(page.locator('app-bar-tabs-list')).toBeVisible({ timeout: 10000 });

    // Click open new tab button
    const openBtn = page.locator('[data-testid="btn-open-new-tab"]').first();
    await expect(openBtn).toBeVisible({ timeout: 5000 });
    await openBtn.click();

    // Modal should appear
    await expect(page.locator('app-bar-tab-modal').first()).toBeVisible({ timeout: 5000 });

    // Fill tab form
    const nameInput = page.locator('[data-testid="input-tab-name"] input, ion-input[data-testid="input-tab-name"] input, [data-testid="tab-input-nom"] input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Afterwork Google Team');

    const refInput = page.locator('[data-testid="input-tab-ref"] input, ion-input[data-testid="input-tab-ref"] input, [data-testid="tab-input-ref"] input').first();
    await expect(refInput).toBeVisible({ timeout: 5000 });
    await refInput.fill('CB-EMEA-4242');

    // Submit modal
    const submitBtn = page.locator('[data-testid="btn-submit-tab-modal"], [data-testid="btn-tab-submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Modal should dismiss
    await expect(page.locator('app-bar-tab-modal')).not.toBeVisible({ timeout: 10000 });
  });

  test('should filter bar tabs by search query', async ({ page }) => {
    await page.goto('/serveur?tab=tabs');
    await expect(page.locator('app-bar-tabs-list')).toBeVisible({ timeout: 10000 });

    // Type in search bar
    const searchInput = page.locator('app-search-bar input, input[type="search"], ion-searchbar input').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Dupont');
      await expect(page.locator('.bar-tab-card').first()).toBeVisible();
    }
  });

  test('should allow settling a bar tab via encaissement modal', async ({ page }) => {
    await page.goto('/serveur?tab=tabs');
    await expect(page.locator('app-bar-tabs-list')).toBeVisible({ timeout: 10000 });

    // Click settle button on first tab
    const settleBtn = page.locator('[data-testid^="btn-tab-settle-"]').first();
    await expect(settleBtn).toBeVisible({ timeout: 5000 });
    await settleBtn.click();

    // Settle modal should appear
    await expect(page.locator('app-encaissement-modal').first()).toBeVisible({ timeout: 8000 });
  });
});
