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
        roles: ['ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN'],
      }),
    });
  });

  await page.route('**/api/cocktails**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 42,
          ...body,
          disponible: true,
          saisonnier: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, nom: 'Mojito', prix: 8.5, categorie: 'ALCOOLISE', disponible: true, ingredients: [], variantes: [] },
        { id: 2, nom: 'Virgin Mojito', prix: 6.0, categorie: 'SANS_ALCOOL', disponible: true, ingredients: [], variantes: [] },
      ]),
    });
  });

  await page.route('**/api/recipe-step-templates**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99,
          ...body,
          isPredefined: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Shaker vigoureusement',
          actionType: 'SHAKE',
          defaultDurationSeconds: 15,
          icon: 'wine-outline',
          isPredefined: true,
        },
        {
          id: 2,
          name: 'Filtrer (Passoire)',
          actionType: 'STRAIN',
          defaultDurationSeconds: 10,
          icon: 'funnel-outline',
          isPredefined: true,
        },
        {
          id: 3,
          name: 'Piler au pilon',
          actionType: 'MUDDLE',
          defaultDurationSeconds: 12,
          icon: 'hammer-outline',
          isPredefined: true,
        },
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

  await page.route('**/api/glassware**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, nom: 'Verre Tumbler / Highball', contenanceCl: 35.0, description: 'Verre classique pour long drinks', isPredefined: true },
        { id: 2, nom: 'Verre Old Fashioned / Rocks', contenanceCl: 30.0, description: 'Verre bas pour cocktails remués', isPredefined: true },
        { id: 3, nom: 'Coupe à Cocktail / Martini', contenanceCl: 22.0, description: 'Coupe cocktail élégante', isPredefined: true },
        { id: 4, nom: 'Verre Margarita', contenanceCl: 33.0, description: 'Verre pour margarita au sel', isPredefined: true },
        { id: 5, nom: 'Verre Ballon / Copa', contenanceCl: 60.0, description: 'Grand verre ballon', isPredefined: true },
        { id: 6, nom: 'Flûte à Champagne', contenanceCl: 18.0, description: 'Flûte à bulles', isPredefined: true },
        { id: 7, nom: 'Tasse en cuivre', contenanceCl: 45.0, description: 'Tasse en cuivre pour Moscow Mule', isPredefined: true },
        { id: 8, nom: 'Verre Tiki', contenanceCl: 50.0, description: 'Verre tiki exotique', isPredefined: true },
        { id: 9, nom: 'Verre à Shot / Chupito', contenanceCl: 5.0, description: 'Verre à shooter', isPredefined: true }
      ]),
    });
  });

  await page.route('**/api/commandes/*/items', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        tableId: 1,
        statut: 'EN_ATTENTE',
        items: [],
      }),
    });
  });

  await page.route('**/api/commandes**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          tableId: body?.tableId || 1,
          tableNumero: 1,
          statut: 'EN_ATTENTE',
          items: [],
          total: 8.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          tableId: 1,
          tableNumero: 1,
          statut: 'EN_ATTENTE',
          items: [
            { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 9.5 }
          ],
          total: 19.0,
          dateCommande: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route('**/api/commandes/statut/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          tableId: 1,
          tableNumero: 1,
          tableNom: 'Table 1',
          statut: 'EN_ATTENTE',
          serveurUsername: 'serveur1',
          total: 19.0,
          dateCommande: new Date().toISOString(),
          items: [{ id: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 9.5 }],
        }
      ]),
    });
  });

  await page.route('**/api/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chiffreAffairesJour: 450.0,
        chiffreAffairesMois: 12500.0,
        commandesTotales: 28,
        commandesEnAttente: 3,
        commandesEnPreparation: 2,
        commandesPret: 1,
        commandesLivrees: 22,
        topCocktails: [
          { id: 1, nom: 'Mojito', nombreCommandes: 15, revenuTotal: 127.5 },
          { id: 2, nom: 'Virgin Mojito', nombreCommandes: 8, revenuTotal: 48.0 },
        ],
      }),
    });
  });

  await page.route('**/api/etages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, code: 'RDC', nom: 'Rez-de-chaussée', ordre: 1 },
        { id: 2, code: 'ETAGE_1', nom: 'Étage 1', ordre: 2 },
      ]),
    });
  });

  await page.route('**/api/tables/etages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['RDC', 'Terrasse', 'Etage 1']),
    });
  });

  await page.route('**/api/tables**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, numero: 1, nom: 'Table 1', capacite: 4, zone: 'Bar', etage: 'RDC', occupee: false },
        { id: 2, numero: 2, nom: 'Table 2', capacite: 2, zone: 'Terrasse', etage: 'Terrasse', occupee: true },
      ]),
    });
  });

  await page.route('**/api/zones**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, nom: 'Bar', etage: 'RDC' },
        { id: 2, nom: 'Terrasse', etage: 'Terrasse' },
      ]),
    });
  });

  await page.route('**/api/plan-salle/positions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, tableId: 1, x: 100, y: 100, shape: 'square', rotation: 0 },
        { id: 2, tableId: 2, x: 250, y: 100, shape: 'circle', rotation: 0 },
      ]),
    });
  });

  await page.route('**/api/factures**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, numero: 'FAC-2026-001', tableNumero: 1, total: 25.0, totalTTC: 25.0, reglee: false, dateFacture: new Date().toISOString(), items: [] },
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

  await page.route('**/api/shifts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          userId: 2,
          userName: 'serveur1',
          dateShift: '2026-08-20',
          typeShift: 'MATIN',
          typePoste: 'SERVEUR',
          heureDebut: '10:00',
          heureFin: '16:00',
          dureePauseMinutes: 30
        }
      ]),
    });
  });

  await page.route('**/api/closures**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, type: 'WEEKLY_RECURRING', dayOfWeek: 'SUNDAY', reason: 'Fermeture hebdomadaire' }
      ]),
    });
  });

  await page.route('**/api/schedule/publication**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        weekStart: '2026-08-17',
        publishedAt: '2026-08-15T18:00:00Z',
        publishedBy: 'admin'
      }),
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

  await page.route('**/api/settings**', async (route) => {
    if (route.request().method() === 'PUT') {
      const data = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          primaryColor: data?.primaryColor || '#6c7fe8',
          primaryColorStrong: data?.primaryColorStrong || '#5a68d6',
          logoUrl: data?.logoUrl || null,
          establishmentName: data?.establishmentName || 'OpenBar',
          defaultTheme: data?.defaultTheme || 'DARK',
          tempsAlerteWarningMinutes: data?.tempsAlerteWarningMinutes ?? 3,
          tempsAlerteCommandeMinutes: data?.tempsAlerteCommandeMinutes ?? 5,
          tempsAlerteCritiqueCommandeMinutes: data?.tempsAlerteCritiqueCommandeMinutes ?? 10,
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        primaryColor: '#6c7fe8',
        primaryColorStrong: '#5a68d6',
        logoUrl: null,
        establishmentName: 'OpenBar',
        defaultTheme: 'DARK',
        tempsAlerteWarningMinutes: 3,
        tempsAlerteCommandeMinutes: 5,
        tempsAlerteCritiqueCommandeMinutes: 10,
        updatedAt: new Date().toISOString(),
      }),
    });
  });
}
