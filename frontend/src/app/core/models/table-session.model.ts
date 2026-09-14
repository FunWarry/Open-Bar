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

  /**
   * Session UUID of the table owner / host.
   */
  ownerGuestSessionId?: string | null;

  /**
   * Nickname of the table owner / host.
   */
  ownerGuestName?: string | null;

  /**
   * Whether the querying guest is the table owner / host.
   */
  isOwner?: boolean;
}

/**
 * Status of a table join authorization request.
 */
export type TableJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Table join authorization request payload.
 */
export interface TableJoinRequest {
  id?: number;
  tableId: number;
  applicantSessionId: string;
  applicantName: string;
  status: TableJoinRequestStatus;
  sessionToken?: string | null;
  createdAt?: string;
}

/**
 * Table join approval or rejection payload.
 */
export interface TableJoinApprovalRequest {
  ownerSessionId: string;
  approved: boolean;
}
