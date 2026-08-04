export type TypeShift = 'MATIN' | 'SOIR' | 'COUPURE' | 'NUIT' | 'CONGE';
export type TypePoste = 'SERVEUR' | 'BARMAN' | 'CAISSE' | 'MANAGER';

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
  heuresEffectuees?: number;
  notes?: string;
}
