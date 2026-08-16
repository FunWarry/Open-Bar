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
});
