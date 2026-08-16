import { Page } from '@playwright/test';

/**
 * Sets up Playwright route mocking for all OpenBar REST endpoints.
 * Ensures fast, 100% isolated and deterministic E2E execution without external database dependency.
 *
 * @param page Playwright page instance
 */
export async function setupMockApi(page: Page): Promise<void> {
  await page.route('**/api/setup/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ initialized: true }),
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    const postData = route.request().postDataJSON();
    const { username, password } = postData || {};

    if (password === 'wrongpassword') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ status: 401, error: 'Unauthorized', message: 'Bad credentials' }),
      });
      return;
    }

    const u = (username || '').toLowerCase();
    let roles = ['ADMIN', 'MANAGER'];
    if (u.includes('barman')) {
      roles = ['BARMAN'];
    } else if (u.includes('serveur')) {
      roles = ['SERVEUR'];
    } else if (u.includes('manager')) {
      roles = ['MANAGER', 'ADMIN'];
    } else if (u.includes('admin')) {
      roles = ['ADMIN', 'MANAGER'];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        username: username || 'admin',
        email: `${username || 'admin'}@openbar.fr`,
        roles,
        enabled: true,
        token: 'mock-jwt-token-e2e',
        refreshToken: 'mock-refresh-token-e2e',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        username: 'admin',
        email: 'admin@openbar.fr',
        roles: ['ADMIN', 'MANAGER'],
      }),
    });
  });

  await page.route('**/api/cocktails**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, nom: 'Mojito', prix: 8.5, categorie: 'ALCOOLISE', ingredients: [], variantes: [] },
        { id: 2, nom: 'Virgin Mojito', prix: 6.0, categorie: 'SANS_ALCOOL', ingredients: [], variantes: [] },
      ]),
    });
  });

  await page.route('**/api/ingredients**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, nom: 'Rhum Blanc', quantiteStock: 100, seuilAlerte: 20, uniteMesure: 'cl' },
        { id: 2, nom: 'Menthe', quantiteStock: 50, seuilAlerte: 10, uniteMesure: 'g' },
      ]),
    });
  });

  await page.route('**/api/commandes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          tableId: 1,
          tableNumero: 1,
          statut: 'EN_ATTENTE',
          items: [],
          total: 14.5,
          createdAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route('**/api/tables**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, numero: 1, capacite: 4, zone: 'Bar', occupee: false },
        { id: 2, numero: 2, capacite: 2, zone: 'Terrasse', occupee: true },
      ]),
    });
  });

  await page.route('**/api/factures**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, reference: 'FAC-2026-001', montantTotal: 25.0, statut: 'NON_REGLEE' },
      ]),
    });
  });

  await page.route('**/api/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, username: 'admin', email: 'admin@openbar.fr', roles: ['ADMIN'] },
        { id: 2, username: 'serveur1', email: 'serveur1@openbar.fr', roles: ['SERVEUR'] },
      ]),
    });
  });

  await page.route('**/api/employees**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/planning**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/configs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        nom: 'OpenBar Test',
        devise: 'EUR',
        timeZone: 'Europe/Paris',
      }),
    });
  });
}
