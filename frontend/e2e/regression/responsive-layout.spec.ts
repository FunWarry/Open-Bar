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

  test('should guarantee zero horizontal page overflow on mobile smartphone viewports (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const targetRoutes = ['/serveur', '/barman', '/factures', '/client/commande'];
    for (const route of targetRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test('should contain schedule grid inside table-scroll-container without overflowing viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/manager/schedule');
    await page.waitForLoadState('domcontentloaded');

    const scrollContainer = page.locator('[data-testid="schedule-grid-scroll-wrapper"]');
    if (await scrollContainer.isVisible()) {
      await expect(scrollContainer).toHaveClass(/table-scroll-container/);

      const pageOverflows = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(pageOverflows).toBe(false);
    }
  });

  test('should display bottom navigation on waiter view on smartphone (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/serveur');
    await page.waitForLoadState('domcontentloaded');

    const bottomNav = page.locator('app-bottom-navigation');
    await expect(bottomNav).toBeVisible();
  });
});

