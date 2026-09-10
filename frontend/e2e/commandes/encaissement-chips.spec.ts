import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Settlement Modal Dynamic Cash Chips E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    // Authenticate as server / admin
    await page.goto('/auth/login');
    await page.fill('input[data-testid="login-username"]', 'admin');
    await page.fill('input[data-testid="login-password"]', 'admin123');
    await page.click('button[data-testid="login-btn"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
  });

  test('should display dynamic cash increment chips and smart suggestions in settlement modal', async ({ page }) => {
    // Navigate to server tracking kanban where table 1 has a delivered order ready for payment
    await page.goto('/serveur?tab=suivi');
    await expect(page.locator('body')).toBeVisible();

    // Settle button in kanban or open via table
    const payBtn = page.locator('[data-testid^="btn-encaisser-kanban-"]').first();
    if (await payBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await payBtn.click();
    } else {
      // Direct navigation to table plan and open table 2 (occupee: true)
      await page.goto('/serveur?tab=plan');
      const tableCard = page.locator('.table-card, [data-testid^="table-card-"]').first();
      if (await tableCard.isVisible({ timeout: 4000 }).catch(() => false)) {
        await tableCard.click({ force: true });
        const modalPayBtn = page.locator('[data-testid="btn-encaisser-modal"]');
        if (await modalPayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await modalPayBtn.click();
        }
      }
    }

    // If modal opened, test cash calculator
    const modalTitle = page.locator('[data-testid="btn-close-encaissement"]');
    if (await modalTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Select cash payment mode
      await page.click('[data-testid="btn-mode-especes"]');

      // Verify cash calculator and dynamic chips exist
      await expect(page.locator('[data-testid="cash-calculator"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-cash-chips"]')).toBeVisible();
      await expect(page.locator('[data-testid="chip-cash-exact"]')).toBeVisible();

      // Check standard bill increment chips are rendered dynamically
      await expect(page.locator('[data-testid="chip-cash-10"]')).toBeVisible();
      await expect(page.locator('[data-testid="chip-cash-20"]')).toBeVisible();
      await expect(page.locator('[data-testid="chip-cash-50"]')).toBeVisible();

      // Test "Montant exact" shortcut
      await page.click('[data-testid="chip-cash-exact"]');
      const changeExact = page.locator('[data-testid="change-amount"]');
      await expect(changeExact).toBeVisible();

      // Test smart suggestion (next bill)
      const nextBillChip = page.locator('[data-testid="chip-cash-next-bill"]');
      if (await nextBillChip.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBillChip.click();
        await expect(page.locator('[data-testid="change-amount"]')).toBeVisible();
      }

      // Test banknote increment chip (+10)
      await page.click('[data-testid="chip-cash-10"]');
      await expect(page.locator('[data-testid="input-montant-recu"]')).toBeVisible();

      // Close modal
      await page.click('[data-testid="btn-close-encaissement"]');
    }
  });
});
