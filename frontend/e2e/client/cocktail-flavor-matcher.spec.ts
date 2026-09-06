import { test, expect } from '@playwright/test';
import { setupMockApi } from '../helpers/mock-api.helper';

test.describe('Cocktail Flavor Profile Matcher & Dietary Filter Engine E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);

    // Mock facets API endpoint
    await page.route('**/api/cocktails/facets**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          flavorCounts: {
            FRUITY: 8,
            SMOKY: 2,
            SWEET: 6,
            SOUR: 4,
            BITTER: 3,
            SPICY: 2,
            HERBAL: 5,
          },
          mocktailsCount: 4,
          veganCount: 10,
          glutenFreeCount: 9,
          lowAbvCount: 3,
          minAlcoholLevel: 0,
          maxAlcoholLevel: 25,
          totalAvailable: 15,
        }),
      });
    });

    // Mock cocktails catalog with flavor profiles and dietary flags
    await page.route('**/api/cocktails**', async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/facets') && !route.request().url().includes('/matcher')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              nom: 'Mojito Tropical',
              description: 'Fresh mint, lime and tropical passion fruit',
              prix: 9.0,
              categorie: 'ALCOOLISE',
              disponible: true,
              isMocktail: false,
              alcoholLevel: 12.0,
              isVegan: true,
              isGlutenFree: true,
              flavorProfiles: ['FRUITY', 'SWEET'],
            },
            {
              id: 2,
              nom: 'Virgin Herbal Cooler',
              description: 'Cucumber, basil and botanical tonic',
              prix: 6.5,
              categorie: 'SANS_ALCOOL',
              disponible: true,
              isMocktail: true,
              alcoholLevel: 0,
              isVegan: true,
              isGlutenFree: true,
              flavorProfiles: ['HERBAL', 'SOUR'],
            },
            {
              id: 3,
              nom: 'Smoky Mezcal Fire',
              description: 'Artisanal mezcal, chili syrup and bitters',
              prix: 12.0,
              categorie: 'ALCOOLISE',
              disponible: true,
              isMocktail: false,
              alcoholLevel: 22.0,
              isVegan: false,
              isGlutenFree: true,
              flavorProfiles: ['SMOKY', 'SPICY'],
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should display interactive matcher bar and filter by flavor profiles in customer view', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    const modal = page.locator('[data-testid="nickname-modal"]');
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alex');
      await page.click('[data-testid="btn-save-guest-nickname"]');
      await expect(modal).not.toBeVisible();
    }

    // 1. Check matcher bar visibility
    const matcherBar = page.locator('[data-testid="cocktail-matcher-bar"]');
    await expect(matcherBar).toBeVisible();

    // 2. Click on "Fruity" flavor chip
    const fruityChip = page.locator('[data-testid="matcher-flavor-FRUITY"]');
    await expect(fruityChip).toBeVisible();
    await fruityChip.click();
    await expect(fruityChip).toHaveClass(/active/);

    // 3. Clear all filters button becomes visible
    const clearBtn = page.locator('[data-testid="matcher-clear-btn"]');
    await expect(clearBtn).toBeVisible();

    // 4. Reset filters
    await clearBtn.click();
    await expect(fruityChip).not.toHaveClass(/active/);
  });

  test('should toggle dietary preferences (mocktail, vegan, gluten-free)', async ({ page }) => {
    await page.goto('/client/commande?table=1&token=active-mock-session-token');

    const modal = page.locator('[data-testid="nickname-modal"]');
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('[data-testid="input-guest-nickname"] input, [data-testid="input-guest-nickname"]', 'Alex');
      await page.click('[data-testid="btn-save-guest-nickname"]');
      await expect(modal).not.toBeVisible();
    }

    // Click on mocktail dietary chip
    const mocktailChip = page.locator('[data-testid="matcher-dietary-mocktail"]');
    await expect(mocktailChip).toBeVisible();
    await mocktailChip.click();
    await expect(mocktailChip).toHaveClass(/active/);

    // Click on vegan dietary chip
    const veganChip = page.locator('[data-testid="matcher-dietary-vegan"]');
    await expect(veganChip).toBeVisible();
    await veganChip.click();
    await expect(veganChip).toHaveClass(/active/);

    // Reset all
    const clearBtn = page.locator('[data-testid="matcher-clear-btn"]');
    await clearBtn.click();
    await expect(mocktailChip).not.toHaveClass(/active/);
    await expect(veganChip).not.toHaveClass(/active/);
  });
});
