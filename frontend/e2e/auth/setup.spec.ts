import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Initial Setup E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Override setup status to uninitialized for setup flow
    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ initialized: false, userCount: 0 }),
      });
    });

    // Mock initial admin account creation endpoint
    await page.route('**/api/setup/admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          username: 'admin',
          email: 'admin@openbar.lan',
          nom: 'Admin',
          prenom: 'Initial',
          roles: ['ROLE_ADMIN']
        }),
      });
    });
  });

  test('should display initial setup form with single-step admin creation elements', async ({ page }) => {
    await page.goto('/setup');

    await expect(page.locator('[data-testid="setup-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-terms-acceptance"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-submit-btn"] button')).toBeDisabled();
  });

  test('should create admin account and navigate to login', async ({ page }) => {
    await page.goto('/setup');

    // Fill credentials
    const usernameInput = page.locator('input').first();
    await usernameInput.fill('admin');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('admin@openbar.lan');

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Admin123456!');
    await passwordInputs.nth(1).fill('Admin123456!');

    // Accept terms
    await page.locator('[data-testid="setup-accept-terms-checkbox"]').click();

    // Verify submit button is enabled and submit
    const submitBtn = page.locator('[data-testid="setup-submit-btn"] button');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for redirect to login
    await page.waitForURL('**/auth/login', { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });
});
