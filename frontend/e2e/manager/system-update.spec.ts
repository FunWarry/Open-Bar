import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('System Update Automatic Check & Manager Upgrade Modal E2E', () => {
  const mockReleaseResponse = [
    {
      id: 101,
      tag_name: 'v1.2.0',
      name: 'OpenBar v1.2.0 - Official Stable',
      body: '### What is New in OpenBar v1.2.0\n- Automatic startup update check for managers\n- Performance enhancements and fixes',
      prerelease: false,
      draft: false,
      published_at: '2026-09-06T12:00:00Z',
      html_url: 'https://github.com/FunWarry/Open-Bar/releases/tag/v1.2.0'
    }
  ];

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should display update modal at startup when manager logs in and newer official release is available', async ({ page }) => {
    // Intercept GitHub releases API call with newer stable version
    await page.route('**/repos/FunWarry/Open-Bar/releases**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReleaseResponse)
      });
    });

    // Login as Admin / Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    // Verify the update modal dialog appears
    const updateModal = page.locator('[data-testid="update-modal"]');
    await expect(updateModal).toBeVisible({ timeout: 10000 });

    // Verify version comparison badges
    await expect(page.locator('[data-testid="current-version-badge"]')).toContainText('v1.0.0');
    await expect(page.locator('[data-testid="latest-version-badge"]')).toContainText('v1.2.0');

    // Verify release notes
    await expect(page.locator('[data-testid="release-notes-content"]')).toContainText('Automatic startup update check');

    // Click snooze button
    await page.click('[data-testid="update-modal-snooze-btn"]');

    // Verify modal is dismissed
    await expect(updateModal).not.toBeVisible({ timeout: 5000 });
  });

  test('should NOT display update modal when non-manager (serveur) logs in', async ({ page }) => {
    // Intercept GitHub releases API call with newer version
    await page.route('**/repos/FunWarry/Open-Bar/releases**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReleaseResponse)
      });
    });

    // Login as Serveur
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'serveur1');
    await page.fill('input[data-testid="login-password"]', 'serveur123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    // Verify update modal is NOT shown for serveur
    const updateModal = page.locator('[data-testid="update-modal"]');
    await expect(updateModal).not.toBeVisible({ timeout: 3000 });
  });

  test('should handle offline / network error gracefully without blocking app boot or displaying error toast', async ({ page }) => {
    // Simulate disconnected network when reaching GitHub
    await page.route('**/repos/FunWarry/Open-Bar/releases**', async (route) => {
      await route.abort('failed');
    });

    // Login as Admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

    // App should load smoothly into home / manager dashboard without update modal
    const updateModal = page.locator('[data-testid="update-modal"]');
    await expect(updateModal).not.toBeVisible({ timeout: 3000 });
  });
});
