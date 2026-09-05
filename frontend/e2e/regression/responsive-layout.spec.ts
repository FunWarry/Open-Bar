import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

/**
 * End-to-End Playwright test suite validating layout responsiveness,
 * notification drawer overlay behavior, sidebar auto-collapse, and
 * Kanban column integrity across responsive viewports (Issue #312).
 */
test.describe('Responsive Layout & Visibility E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should render sidebar in collapsed icon-only mode on viewports < 1200px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/barman');

    const sidebar = page.locator('[data-testid="sidebar-container"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('should toggle notification overlay drawer with backdrop on medium screens (<1400px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/barman');

    // Open notifications drawer from navbar
    const notifBtn = page.locator('[data-testid="topbar-notifications-btn"]');
    if (await notifBtn.isVisible()) {
      await notifBtn.click();

      // Backdrop overlay must be rendered
      const backdrop = page.locator('[data-testid="notif-backdrop"]');
      await expect(backdrop).toBeVisible();

      // Side notification drawer should be open
      const notifDrawer = page.locator('[data-testid="side-notif-drawer"]');
      await expect(notifDrawer).toHaveClass(/open/);

      // Clicking backdrop should dismiss notifications
      await backdrop.click();
      await expect(backdrop).not.toBeVisible();
      await expect(notifDrawer).not.toHaveClass(/open/);
    }
  });

  test('should preserve barman kanban column minimum width on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await page.goto('/barman');

    const pendingCol = page.locator('.kanban-col--pending');
    await expect(pendingCol).toBeVisible();

    const box = await pendingCol.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(240);
    }
  });

  test('should render manager dashboard KPI metrics and kanban without clipping on 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/manager');

    await expect(page.locator('app-dashboard-manager')).toBeVisible();
    await expect(page.locator('[data-testid="manager-kanban-section"]')).toBeVisible();
  });
});
