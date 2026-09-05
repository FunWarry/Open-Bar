import { Commande } from '../../app/core/models/commande.model';

export const MOCK_COMMANDE_EN_ATTENTE: Commande = {
  id: 101,
  tableId: 1,
  tableNumero: 1,
  serveurId: 3,
  serveurUsername: 'serveur1',
  statut: 'EN_ATTENTE',
  notes: 'Sans paille plastique svp',
  total: 28.5,
  pourboire: 2.0,
  dateCommande: '2026-08-20T01:10:00Z',
  items: [
    {
      id: 1,
      cocktailId: 1,
      cocktailNom: 'Mojito',
      varianteId: 1,
      varianteNom: 'Mojito Framboise',
      quantite: 2,
      prixUnitaire: 11.0,
      notes: 'Menthe bien fraîche'
    },
    {
      id: 2,
      cocktailId: 3,
      cocktailNom: 'Virgin Mojito',
      quantite: 1,
      prixUnitaire: 6.5
    }
  ],
  createdAt: '2026-08-20T01:10:00Z',
  updatedAt: '2026-08-20T01:10:00Z'
};

export const MOCK_COMMANDE_EN_PREPARATION: Commande = {
  id: 102,
  tableId: 5,
  tableNumero: 5,
  serveurId: 4,
  serveurUsername: 'serveur2',
  statut: 'EN_PREPARATION',
  total: 20.0,
  dateCommande: '2026-08-20T01:05:00Z',
  datePreparation: '2026-08-20T01:08:00Z',
  items: [
    {
      id: 3,
      cocktailId: 2,
      cocktailNom: 'Margarita',
      quantite: 2,
      prixUnitaire: 10.0,
      prioritaire: true
    }
  ],
  createdAt: '2026-08-20T01:05:00Z',
  updatedAt: '2026-08-20T01:08:00Z'
};

export const MOCK_COMMANDE_PRETE: Commande = {
  id: 103,
  tableId: 12,
  tableNumero: 12,
  serveurId: 3,
  serveurUsername: 'serveur1',
  statut: 'PRET',
  total: 22.0,
  dateCommande: '2026-08-20T01:00:00Z',
  datePreparation: '2026-08-20T01:04:00Z',
  datePret: '2026-08-20T01:07:00Z',
  items: [
    {
      id: 4,
      cocktailId: 4,
      cocktailNom: 'Negroni',
      quantite: 2,
      prixUnitaire: 11.0
    }
  ],
  createdAt: '2026-08-20T01:00:00Z',
  updatedAt: '2026-08-20T01:04:00Z'
};

export const MOCK_COMMANDE_LIVREE: Commande = {
  id: 104,
  tableId: 20,
  tableNumero: 20,
  serveurId: 4,
  serveurUsername: 'serveur2',
  statut: 'LIVREE',
  total: 19.0,
  dateCommande: '2026-08-20T00:50:00Z',
  datePreparation: '2026-08-20T00:54:00Z',
  datePret: '2026-08-20T00:56:00Z',
  dateLivraison: '2026-08-20T00:58:00Z',
  items: [
    {
      id: 5,
      cocktailId: 1,
      cocktailNom: 'Mojito',
      quantite: 2,
      prixUnitaire: 9.5
    }
  ],
  createdAt: '2026-08-20T00:50:00Z',
  updatedAt: '2026-08-20T00:58:00Z'
};

export const MOCK_COMMANDE_REGLEE: Commande = {
  id: 105,
  tableId: 30,
  tableNumero: 30,
  serveurId: 3,
  serveurUsername: 'serveur1',
  statut: 'REGLEE',
  total: 30.5,
  pourboire: 3.5,
  dateCommande: '2026-08-20T00:30:00Z',
  datePreparation: '2026-08-20T00:34:00Z',
  dateLivraison: '2026-08-20T00:38:00Z',
  dateReglement: '2026-08-20T01:00:00Z',
  items: [
    {
      id: 6,
      cocktailId: 1,
      cocktailNom: 'Mojito',
      quantite: 2,
      prixUnitaire: 9.5
    },
    {
      id: 7,
      cocktailId: 4,
      cocktailNom: 'Negroni',
      quantite: 1,
      prixUnitaire: 11.5
    }
  ],
  createdAt: '2026-08-20T00:30:00Z',
  updatedAt: '2026-08-20T01:00:00Z'
};

export const MOCK_COMMANDE_LIST: Commande[] = [
  MOCK_COMMANDE_EN_ATTENTE,
  MOCK_COMMANDE_EN_PREPARATION,
  MOCK_COMMANDE_PRETE,
  MOCK_COMMANDE_LIVREE,
  MOCK_COMMANDE_REGLEE
];

/**
 * Creates a customized mock Commande object.
 */
export function createMockCommande(overrides: Partial<Commande> = {}): Commande {
  return {
    ...MOCK_COMMANDE_EN_ATTENTE,
    ...overrides
  };
}
