import { EmployeeShift, ShiftPreset, ShiftAuditLog } from '../../app/core/models/shift.model';
import { EstablishmentClosure } from '../../app/core/services/closure.service';
import { WeekSchedulePublicationDTO } from '../../app/core/services/publication.service';

export const MOCK_SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 1,
    typeShift: 'MATIN',
    nom: 'Ouverture Matin',
    heureDebut: '10:00',
    heureFin: '16:00',
    dureePauseMinutes: 30
  },
  {
    id: 2,
    typeShift: 'SOIR',
    nom: 'Service Soir',
    heureDebut: '17:00',
    heureFin: '01:00',
    dureePauseMinutes: 45
  },
  {
    id: 3,
    typeShift: 'COUPURE',
    nom: 'Service Coupure',
    heureDebut: '11:00',
    heureFin: '23:30',
    dureePauseMinutes: 120
  },
  {
    id: 4,
    typeShift: 'NUIT',
    nom: 'Fermeture Nuit',
    heureDebut: '20:00',
    heureFin: '04:00',
    dureePauseMinutes: 30
  }
];

export const MOCK_EMPLOYEE_SHIFTS: EmployeeShift[] = [
  {
    id: 1,
    userId: 3,
    userName: 'serveur1',
    userNom: 'Dupont',
    userPrenom: 'Jean',
    dateShift: '2026-08-20',
    typeShift: 'MATIN',
    typePoste: 'SERVEUR',
    heureDebut: '10:00',
    heureFin: '16:00',
    dureePauseMinutes: 30,
    heuresPrevues: 5.5,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-15T09:00:00Z'
  },
  {
    id: 2,
    userId: 4,
    userName: 'serveur2',
    userNom: 'Martin',
    userPrenom: 'Claire',
    dateShift: '2026-08-20',
    typeShift: 'SOIR',
    typePoste: 'SERVEUR',
    heureDebut: '17:00',
    heureFin: '01:00',
    dureePauseMinutes: 45,
    heuresPrevues: 7.25,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-15T09:00:00Z'
  },
  {
    id: 3,
    userId: 5,
    userName: 'barman1',
    userNom: 'Lefebvre',
    userPrenom: 'Thomas',
    dateShift: '2026-08-20',
    typeShift: 'SOIR',
    typePoste: 'BARMAN',
    heureDebut: '17:00',
    heureFin: '01:00',
    dureePauseMinutes: 45,
    heuresPrevues: 7.25,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-15T09:00:00Z'
  }
];

export const MOCK_CLOSURES: EstablishmentClosure[] = [
  {
    id: 1,
    type: 'WEEKLY_RECURRING',
    dayOfWeek: 'SUNDAY',
    reason: 'Fermeture hebdomadaire du dimanche'
  },
  {
    id: 2,
    type: 'EXCEPTIONAL',
    closureDate: '2026-12-25',
    endDate: '2026-12-25',
    isAnnualRecurring: true,
    reason: 'Jour de Noël'
  },
  {
    id: 3,
    type: 'EXCEPTIONAL',
    closureDate: '2026-01-01',
    endDate: '2026-01-01',
    isAnnualRecurring: true,
    reason: 'Jour de l\'An'
  }
];

export const MOCK_WEEK_PUBLICATION: WeekSchedulePublicationDTO = {
  id: 1,
  weekStart: '2026-08-17',
  publishedAt: '2026-08-15T18:00:00Z',
  publishedBy: 'manager'
};

export const MOCK_SHIFT_AUDIT_LOGS: ShiftAuditLog[] = [
  {
    id: 1,
    shiftId: 1,
    userId: 3,
    userName: 'serveur1',
    userNom: 'Dupont',
    userPrenom: 'Jean',
    dateShift: '2026-08-20',
    action: 'CREATED',
    changedBy: 'manager',
    changedAt: '2026-08-15T09:00:00Z'
  }
];

/**
 * Creates a customized mock EmployeeShift object.
 */
export function createMockEmployeeShift(overrides: Partial<EmployeeShift> = {}): EmployeeShift {
  return {
    ...MOCK_EMPLOYEE_SHIFTS[0],
    ...overrides
  };
}
