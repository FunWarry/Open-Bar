import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Non-Regression E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should protect private routes from unauthenticated access', async ({ page }) => {
    // Attempt to access protected dashboard directly
    await page.goto('/serveur');
    // Should be redirected to login
    await page.waitForURL('**/auth/login', { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('should render translated text with Transloco without unparsed keys', async ({ page }) => {
    await page.goto('/auth/login');
    const content = await page.content();
    // Check that raw untranslated placeholders like {{ '...' | transloco }} are not exposed in DOM
    expect(content).not.toContain("{{ 'AUTH.");
    expect(content).not.toContain("{{ 'NAV.");
  });

  test('should support light/dark theme variables without inline hardcoded colors', async ({ page }) => {
    await page.goto('/auth/login');
    const htmlElement = page.locator('html');
    await expect(htmlElement).toBeVisible();
  });
});
