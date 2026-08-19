import { Facture, ReglementRequest } from '../../app/core/models/facture.model';

export const MOCK_FACTURE_PENDING: Facture = {
  id: 201,
  tableId: 1,
  tableNumero: 1,
  numero: 'FACT-20260820-001',
  total: 28.5,
  totalTTC: 28.5,
  pourboire: 0,
  dateFacture: '2026-08-20T01:10:00Z',
  reglee: false,
  notes: 'Table 1 - Terrasse',
  items: [
    {
      id: 1,
      cocktailNom: 'Mojito Framboise',
      quantite: 2,
      prixUnitaire: 11.0,
      sousTotal: 22.0
    },
    {
      id: 2,
      cocktailNom: 'Virgin Mojito',
      quantite: 1,
      prixUnitaire: 6.5,
      sousTotal: 6.5
    }
  ],
  createdAt: '2026-08-20T01:10:00Z',
  updatedAt: '2026-08-20T01:10:00Z'
};

export const MOCK_FACTURE_REGLEE: Facture = {
  id: 202,
  tableId: 30,
  tableNumero: 30,
  numero: 'FACT-20260820-002',
  total: 30.5,
  totalTTC: 30.5,
  pourboire: 3.5,
  dateFacture: '2026-08-20T00:30:00Z',
  dateReglement: '2026-08-20T01:00:00Z',
  reglee: true,
  modePaiement: 'CARTE',
  notes: 'Paiement sans contact',
  items: [
    {
      id: 3,
      cocktailNom: 'Mojito',
      quantite: 2,
      prixUnitaire: 9.5,
      sousTotal: 19.0
    },
    {
      id: 4,
      cocktailNom: 'Negroni',
      quantite: 1,
      prixUnitaire: 11.5,
      sousTotal: 11.5
    }
  ],
  createdAt: '2026-08-20T00:30:00Z',
  updatedAt: '2026-08-20T01:00:00Z'
};

export const MOCK_FACTURE_LIST: Facture[] = [
  MOCK_FACTURE_PENDING,
  MOCK_FACTURE_REGLEE
];

/**
 * Creates a customized mock Facture object.
 */
export function createMockFacture(overrides: Partial<Facture> = {}): Facture {
  return {
    ...MOCK_FACTURE_PENDING,
    ...overrides
  };
}

/**
 * Creates a mock ReglementRequest payload.
 */
export function createMockReglementRequest(overrides: Partial<ReglementRequest> = {}): ReglementRequest {
  return {
    modePaiement: 'CARTE',
    pourboire: 2.0,
    ...overrides
  };
}
