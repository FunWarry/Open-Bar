import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Sound Alert System & Audio Preferences E2E (#564)', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should open audio settings popover from topbar and display sound controls', async ({ page }) => {
    const soundToggleBtn = page.locator('[data-testid="topbar-sound-toggle"]').first();
    await expect(soundToggleBtn).toBeVisible();
    await soundToggleBtn.click();

    const popover = page.locator('[data-testid="audio-settings-popover"]').first();
    await expect(popover).toBeVisible();

    await expect(page.locator('[data-testid="audio-master-toggle"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audio-volume-badge"]').first()).toContainText('80%');
    await expect(page.locator('[data-testid="audio-pack-select"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audio-trigger-new-order"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audio-trigger-table-call"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audio-trigger-urgent-order"]').first()).toBeVisible();
  });

  test('should audition built-in sound packs from popover', async ({ page }) => {
    const soundToggleBtn = page.locator('[data-testid="topbar-sound-toggle"]').first();
    await soundToggleBtn.click();

    const shakerBtn = page.locator('[data-testid="audition-shaker-chime"]').first();
    await expect(shakerBtn).toBeVisible();
    await shakerBtn.click();

    const retroBtn = page.locator('[data-testid="audition-retro-ding"]').first();
    await expect(retroBtn).toBeVisible();
    await retroBtn.click();

    const urgencyBtn = page.locator('[data-testid="audition-high-urgency"]').first();
    await expect(urgencyBtn).toBeVisible();
    await urgencyBtn.click();
  });

  test('should display embedded audio settings in profile preferences page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('[data-testid="pref-row-sound"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="profile-audio-settings"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="profile-audio-settings"] [data-testid="audio-master-toggle"]').first()).toBeVisible();
  });
});
