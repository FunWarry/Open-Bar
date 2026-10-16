import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Table Reservations Book E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as Admin/Manager
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display reservation book page with metrics and timeline grid', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.locator('[data-testid="reservations-page-container"]')).toBeVisible({ timeout: 10000 });

    // Verify key metrics
    await expect(page.locator('[data-testid="metric-today-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-covers-count"]')).toBeVisible();

    // Verify timeline view container
    await expect(page.locator('[data-testid="timeline-view-container"]')).toBeVisible();

    // Verify unassigned bookings strip
    await expect(page.locator('[data-testid="unassigned-strip"]')).toBeVisible();
    await expect(page.locator('[data-testid="chip-unassigned-booking"]').first()).toBeVisible();

    // Verify booking block on timeline
    await expect(page.locator('[data-testid="booking-block-1"]')).toBeVisible();
  });

  test('should toggle between timeline and list view modes', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.locator('[data-testid="reservations-page-container"]')).toBeVisible();

    // Default is TIMELINE view
    await expect(page.locator('[data-testid="timeline-view-container"]')).toBeVisible();

    // Switch to LIST view
    await page.click('[data-testid="btn-view-list"]');
    await expect(page.locator('[data-testid="list-view-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="row-reservation-1"]')).toBeVisible();

    // Switch back to TIMELINE view
    await page.click('[data-testid="btn-view-timeline"]');
    await expect(page.locator('[data-testid="timeline-view-container"]')).toBeVisible();
  });

  test('should open new reservation modal, fill form and create booking', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.locator('[data-testid="reservations-page-container"]')).toBeVisible();

    // Click New Reservation button
    await page.click('[data-testid="btn-new-reservation"]');
    const modal = page.locator('[data-testid="reservation-modal"]');
    await expect(modal).toBeVisible();

    // Fill customer name and party size
    await page.fill('input[data-testid="input-reservation-customer-name"]', 'Claire Delacroix');
    await page.fill('input[data-testid="input-reservation-guests"]', '4');

    // Submit form
    const submitBtn = page.locator('button[data-testid="btn-submit-reservation"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Modal should close
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('should open edit modal when clicking unassigned booking chip', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.locator('[data-testid="reservations-page-container"]')).toBeVisible();

    // Click on unassigned booking chip
    await page.click('[data-testid="chip-unassigned-booking"]');
    const modal = page.locator('[data-testid="reservation-modal"]');
    await expect(modal).toBeVisible();

    // Should contain customer name Bob Martin
    const customerInput = page.locator('input[data-testid="input-reservation-customer-name"]');
    await expect(customerInput).toHaveValue('Bob Martin');

    // Close modal
    await page.click('button[data-testid="btn-close-modal"]');
    await expect(modal).toBeHidden();
  });
});
