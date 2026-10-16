/**
 * Reservation lifecycle statuses.
 */
export type ReservationStatut = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

/**
 * Interface representing a table reservation in OpenBar.
 */
export interface Reservation {
  id: number;
  nomClient: string;
  telephone?: string | null;
  email?: string | null;
  dateReservation: string;
  heureReservation: string;
  dureeMinutes: number;
  nombrePersonnes: number;
  notes?: string | null;
  statut: ReservationStatut;
  tableId?: number | null;
  tableNumero?: number | null;
  tableCapacite?: number | null;
  tableZone?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new table reservation.
 */
export interface ReservationCreateRequest {
  nomClient: string;
  telephone?: string | null;
  email?: string | null;
  dateReservation: string;
  heureReservation: string;
  dureeMinutes?: number;
  nombrePersonnes: number;
  notes?: string | null;
  statut?: ReservationStatut;
  tableId?: number | null;
}

/**
 * Payload for updating an existing table reservation.
 */
export interface ReservationUpdateRequest {
  nomClient: string;
  telephone?: string | null;
  email?: string | null;
  dateReservation: string;
  heureReservation: string;
  dureeMinutes: number;
  nombrePersonnes: number;
  notes?: string | null;
  statut: ReservationStatut;
  tableId?: number | null;
}

/**
 * Table reservation availability check result.
 */
export interface ReservationAvailability {
  available: boolean;
  capacitySufficient: boolean;
  conflictingBookings: Reservation[];
  message: string;
}
