/**
 * Ephemeral table session status.
 */
export type TableSessionStatus = 'ACTIVE' | 'CLOSED' | 'EXPIRED';

/**
 * Response payload representing the status and validation of a table session.
 */
export interface TableSessionResponse {
  /**
   * Unique session record identifier.
   */
  id?: number | null;

  /**
   * Scanned or requested table identifier.
   */
  tableId: number;

  /**
   * Ephemeral session token for anti-fraud validation.
   */
  sessionToken?: string | null;

  /**
   * Lifecycle status of the session.
   */
  status?: TableSessionStatus | null;

  /**
   * Timestamp when the session was created.
   */
  openedAt?: string | null;

  /**
   * Timestamp of last activity or refresh.
   */
  lastActivityAt?: string | null;

  /**
   * Timestamp when the session expires.
   */
  expiresAt?: string | null;

  /**
   * Whether the session is currently authorized for ordering.
   */
  valid: boolean;

  /**
   * Explanatory message or reason if invalid.
   */
  message?: string | null;
}
