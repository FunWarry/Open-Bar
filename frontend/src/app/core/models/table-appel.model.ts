/**
 * Type of alert triggered by a patron from the QR ordering interface.
 */
export type TableAppelType = 'ASSISTANCE' | 'ADDITION';

/**
 * Processing status of a table alert.
 */
export type TableAppelStatut = 'EN_ATTENTE' | 'ACQUITTE' | 'ANNULE';

/**
 * Interface representing a table assistance or bill request alert.
 */
export interface TableAppel {
  id: number;
  tableId: number;
  tableNumero?: number;
  tableZone?: string;
  type: TableAppelType;
  statut: TableAppelStatut;
  commentaire?: string;
  acquittePar?: string;
  createdAt: string;
  updatedAt?: string;
  acquitteAt?: string;
}

/**
 * Request payload for triggering a table assistance or bill alert.
 */
export interface TableAppelRequest {
  type: TableAppelType;
  commentaire?: string;
}
