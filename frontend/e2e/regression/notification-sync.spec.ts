import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

/**
 * End-to-End Playwright test suite validating notification badge reactivity
 * and side drawer interactions (Issue #316).
 */
test.describe('Notification Badge & Panel Synchronization E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should toggle notification panel and interact with mark-all-read', async ({ page }) => {
    await page.goto('/cocktails');

    // Notification bell button must be visible in navbar
    const notifBtn = page.locator('[data-testid="topbar-notifications-btn"]');
    await expect(notifBtn).toBeVisible();

    // Click to open notification drawer
    await notifBtn.click();

    // Notification drawer panel should be visible
    const notifPanel = page.locator('[data-testid="notification-panel-container"]');
    await expect(notifPanel).toBeVisible();

    // Mark all as read button must be clickable
    const markAllBtn = page.locator('[data-testid="notif-mark-all-read"]');
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();

    // After clicking mark-all-read, badge should not be visible (0 unread)
    const badge = page.locator('[data-testid="topbar-notif-badge"]');
    await expect(badge).not.toBeVisible();
  });
});
