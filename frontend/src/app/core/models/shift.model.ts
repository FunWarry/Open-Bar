export type TypeShift = 'MATIN' | 'SOIR' | 'COUPURE' | 'NUIT' | 'CONGE';
export type TypePoste = 'SERVEUR' | 'BARMAN' | 'CAISSE' | 'MANAGER';
export type ShiftAuditAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface ShiftPreset {
  id?: number;
  typeShift: TypeShift;
  nom: string;
  heureDebut: string;
  heureFin: string;
  dureePauseMinutes?: number;
}

export interface EmployeeShift {
  id?: number;
  userId: number;
  userName?: string;
  userNom?: string;
  userPrenom?: string;
  dateShift: string; // YYYY-MM-DD
  typeShift: TypeShift;
  typePoste: TypePoste;
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  heurePauseDebut?: string;
  dureePauseMinutes?: number;
  heureDebutReelle?: string;
  heureFinReelle?: string;
  heuresSup?: number;
  heuresPrevues?: number;
  heuresEffectuees?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeShiftRequest {
  userId: number;
  dateShift: string;
  typeShift: TypeShift;
  typePoste: TypePoste;
  heureDebut: string;
  heureFin: string;
  heurePauseDebut?: string;
  dureePauseMinutes?: number;
  heureDebutReelle?: string;
  heureFinReelle?: string;
  heuresSup?: number;
  heuresPrevues?: number;
  heuresEffectuees?: number;
  notes?: string;
}

export interface ShiftAuditLog {
  id: number;
  shiftId: number;
  userId?: number;
  userName?: string;
  userNom?: string;
  userPrenom?: string;
  dateShift?: string;
  action: ShiftAuditAction;
  changedBy: string;
  changedAt: string; // ISO DateTime
  previousSnapshot?: string; // JSON
  newSnapshot?: string; // JSON
}
