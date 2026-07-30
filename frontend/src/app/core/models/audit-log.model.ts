/**
 * Interface representing an audit log entry in the system.
 */
export interface AuditLog {
  /** Unique identifier of the audit log entry. */
  id: number;
  /** Unique identifier of the user who performed the action, or null if system action. */
  userId: number | null;
  /** Username of the user, or 'SYSTEM'. */
  userUsername: string;
  /** Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'). */
  action: string;
  /** Type of entity affected (e.g., 'User', 'Cocktail', 'Commande', 'Facture'). */
  entityType: string;
  /** Unique identifier of the affected entity, if applicable. */
  entityId: number | null;
  /** Detailed textual description of the action. */
  details: string;
  /** ISO timestamp string when the action occurred. */
  timestamp: string;
}
