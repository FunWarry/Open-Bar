import { TableBar } from '../../app/core/models/table.model';

export const MOCK_TABLE_LIST: TableBar[] = [
  {
    id: 1,
    numero: 1,
    capacite: 4,
    zone: 'Terrasse',
    etage: 'RDC',
    emplacement: 'Terrasse Nord',
    occupee: true,
    reservee: false,
    serveurId: 3,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 2,
    numero: 2,
    capacite: 2,
    zone: 'Terrasse',
    etage: 'RDC',
    emplacement: 'Terrasse Nord',
    occupee: false,
    reservee: false,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 5,
    numero: 5,
    capacite: 6,
    zone: 'Salle Principale',
    etage: 'RDC',
    emplacement: 'Centre',
    occupee: true,
    reservee: false,
    serveurId: 4,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 12,
    numero: 12,
    capacite: 4,
    zone: 'Mezzanine',
    etage: 'ETAGE_1',
    emplacement: 'Mezzanine Balcon',
    occupee: true,
    reservee: false,
    serveurId: 3,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 20,
    numero: 20,
    capacite: 8,
    zone: 'Salon VIP',
    etage: 'ETAGE_1',
    emplacement: 'VIP Lounge',
    occupee: true,
    reservee: true,
    serveurId: 4,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 30,
    numero: 30,
    capacite: 4,
    zone: 'Rooftop Sky Lounge',
    etage: 'ETAGE_2',
    emplacement: 'Rooftop Bar',
    occupee: false,
    reservee: false,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  }
];

export const MOCK_TABLE_SAMPLE: TableBar = MOCK_TABLE_LIST[0];

/**
 * Creates a customized mock TableBar object.
 */
export function createMockTable(overrides: Partial<TableBar> = {}): TableBar {
  return {
    ...MOCK_TABLE_SAMPLE,
    ...overrides
  };
}
