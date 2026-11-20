import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Client Table Ordering Responsive Redesign E2E (#634)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('openbar_guest_name', 'Alex');
      if (!sessionStorage.getItem('__openbar_e2e_view_mode_initialized')) {
        localStorage.removeItem('openbar_client_menu_view_mode');
        sessionStorage.setItem('__openbar_e2e_view_mode_initialized', '1');
      }
    });

    await page.route('**/api/cocktails', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              nom: 'Mojito Classic',
              description: 'Fresh mint, lime and aged white rum',
              prix: 9.0,
              categorie: 'ALCOOLISE',
              disponible: true,
              isMocktail: false,
              alcoholLevel: 12.0,
              isVegan: true,
              isGlutenFree: true,
              flavorProfiles: ['FRUITY', 'HERBAL'],
              ingredients: [
                { id: 1, ingredientId: 10, ingredientNom: 'White Rum', quantite: 50, uniteMesure: 'ml' },
                { id: 2, ingredientId: 11, ingredientNom: 'Fresh Mint', quantite: 10, uniteMesure: 'feuilles' },
              ],
            },
            {
              id: 2,
              nom: 'Virgin Sunset',
              description: 'Mango, passion fruit and sparkling citrus',
              prix: 6.5,
              categorie: 'SANS_ALCOOL',
              disponible: true,
              isMocktail: true,
              alcoholLevel: 0,
              isVegan: true,
              isGlutenFree: true,
              flavorProfiles: ['FRUITY', 'SWEET'],
              ingredients: [
                { id: 3, ingredientId: 12, ingredientNom: 'Passion Fruit Puree', quantite: 40, uniteMesure: 'ml' },
              ],
            },
            {
              id: 3,
              nom: 'Espresso Martini',
              description: 'Velvety cold brew coffee and vodka',
              prix: 11.0,
              categorie: 'ALCOOLISE',
              disponible: true,
              isMocktail: false,
              alcoholLevel: 16.0,
              isVegan: true,
              isGlutenFree: true,
              flavorProfiles: ['BITTER'],
              ingredients: [],
            },
          ]),
        });
        return;
      }
      await route.fallback();
    });
  });

  test('should deduplicate roulette and pay-at-table triggers across the menu view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    await expect(page.locator('[data-testid="btn-open-roulette-modal"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="btn-open-roulette-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="roulette-hero-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="btn-hero-open-roulette"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="floating-roulette-fab"]')).toHaveCount(0);

    await expect(page.locator('[data-testid="btn-pay-at-table-trigger"]')).toHaveCount(1);

    await page.click('[data-testid="btn-open-roulette-modal"]');
    await expect(page.locator('[data-testid="roulette-modal-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="roulette-modal-content"]')).toBeVisible();
  });

  test('should default to 2-column compact grid on smartphone, toggle view mode, collapse filters, and open bottom-sheet modal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    const grid = page.locator('[data-testid="cocktails-grid"]');
    await expect(grid).toHaveAttribute('data-view-mode', 'compact');

    const card1 = page.locator('[data-testid="product-card-1"]');
    const card2 = page.locator('[data-testid="product-card-2"]');
    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();

    const box1 = await card1.boundingBox();
    const box2 = await card2.boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    // Cards 1 and 2 must sit side-by-side in 2 columns on mobile compact mode
    expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(10);
    expect(box2!.x).toBeGreaterThan(box1!.x + box1!.width / 2);

    // Advanced filters start collapsed on smartphone to preserve above-the-fold menu visibility
    await expect(page.locator('[data-testid="advanced-filters-panel"]')).toHaveCount(0);

    await page.click('[data-testid="btn-toggle-advanced-filters"]');
    await expect(page.locator('[data-testid="advanced-filters-panel"]')).toBeVisible();
    await page.click('[data-testid="matcher-flavor-FRUITY"]');
    await expect(page.locator('[data-testid="advanced-filters-count-badge"]')).toContainText('1');

    // Open cocktail details bottom-sheet modal and verify no recipe quantities leak
    await card1.click();
    const detailModal = page.locator('[data-testid="cocktail-details-modal"]');
    const modalContainer = page.locator('[data-testid="app-modal-container"]');
    await expect(detailModal).toBeVisible();
    await expect(modalContainer).toBeVisible();
    // Wait for Ionic modal enter slide-up animation to settle inside the 375x667 viewport
    await expect
      .poll(async () => {
        const box = await modalContainer.boundingBox();
        return box ? { width: box.width, y: box.y, bottom: box.y + box.height } : null;
      })
      .toEqual(
        expect.objectContaining({
          width: expect.any(Number),
          y: expect.any(Number),
          bottom: expect.any(Number),
        })
      );
    await expect
      .poll(async () => {
        const box = await modalContainer.boundingBox();
        return box !== null && box.width >= 370 && box.y >= 0 && box.y + box.height <= 668;
      })
      .toBe(true);
    await expect(page.locator('[data-testid="cocktail-details-title"]')).toContainText('Mojito Classic');
    const ingredientsText = await page.locator('[data-testid="cocktail-ingredients-section"]').textContent();
    expect(ingredientsText).toContain('White Rum');
    expect(ingredientsText).not.toContain('50 ml');
    expect(ingredientsText).not.toContain('10 feuilles');

    // Add cocktail from bottom-sheet footer and dismiss
    await page.click('[data-testid="modal-cocktail-plus"]');
    await expect(page.locator('[data-testid="floating-cart-bar"]')).toBeVisible();
    await page.click('[data-testid="btn-close-details-footer"]');
    await expect(detailModal).not.toBeVisible();

    // Switch to detailed 1-column view and verify persistence across reload
    await page.click('[data-testid="btn-view-mode-detailed"]');
    await expect(grid).toHaveAttribute('data-view-mode', 'detailed');

    const detailedBox1 = await card1.boundingBox();
    const detailedBox2 = await card2.boundingBox();
    expect(detailedBox2!.y).toBeGreaterThan(detailedBox1!.y + detailedBox1!.height - 5);

    await page.reload();
    await expect(page.locator('[data-testid="cocktails-grid"]')).toHaveAttribute('data-view-mode', 'detailed');

    // Zero horizontal overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  });

  test('should default to detailed multi-column grid on tablet and desktop and allow compact switching', async ({ page }) => {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/client/commande?table=1&token=active-mock-session-token');
      await page.evaluate(() => localStorage.removeItem('openbar_client_menu_view_mode'));
      await page.reload();

      const grid = page.locator('[data-testid="cocktails-grid"]');
      await expect(grid).toHaveAttribute('data-view-mode', 'detailed');
      await expect(page.locator('[data-testid="advanced-filters-panel"]')).toBeVisible();

      await page.click('[data-testid="btn-view-mode-compact"]');
      await expect(grid).toHaveAttribute('data-view-mode', 'compact');

      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow).toBe(false);
    }
  });
});
