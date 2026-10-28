import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Client QR Code Self-Service Order E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should display client ordering view without authentication', async ({ page }) => {
    // Navigate directly to public client QR route
    await page.goto('/client/commande');
    await expect(page.locator('ion-content, body')).toBeVisible();
  });

  test('should access table menu with active session token', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=active-mock-session-token');
    await expect(page.locator('.menu-title')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-card"]')).not.toBeVisible();
  });

  test('should display expired session card and allow refresh when session is expired', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=expired-token');
    await expect(page.locator('[data-testid="session-expired-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-contact-server"]')).toBeVisible();

    // Click refresh session button
    await page.click('[data-testid="btn-refresh-session"]');
    await expect(page.locator('[data-testid="session-expired-card"]')).not.toBeVisible();
    await expect(page.locator('.menu-title')).toBeVisible();
  });

  test('should display Happy Hour active banner and promo countdown in menu view', async ({ page }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const startStr = `${String(currentHour).padStart(2, '0')}:00`;
    const endStr = `${String((currentHour + 2) % 24).padStart(2, '0')}:00`;
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];

    await page.route('**/api/happy-hour', async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/active') && !route.request().url().includes('/preview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              name: 'Happy Hour Afterwork',
              startTime: startStr,
              endTime: endStr,
              daysOfWeek: [currentDay],
              discountType: 'PERCENTAGE',
              discountValue: 25,
              active: true,
              categories: [],
              cocktailIds: [],
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/client/commande?table=1&token=active-mock-session-token');
    await expect(page.locator('.menu-title')).toBeVisible();
    await expect(page.locator('[data-testid="hh-active-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="hh-active-countdown"]')).toBeVisible();
  });
});
