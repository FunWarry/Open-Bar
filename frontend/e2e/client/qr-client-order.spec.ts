import { test, expect } from '@playwright/test';

test.describe('Client QR Code Self-Service Order E2E', () => {

  test('should display client ordering view without authentication', async ({ page }) => {
    // Navigate directly to public client QR route
    await page.goto('/client/menu');
    await expect(page.locator('ion-content, .client-menu-container')).toBeVisible();
  });
});
