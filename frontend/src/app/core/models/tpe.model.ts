/**
 * Functional roles assigned to physical payment terminals (TPE) across the establishment.
 */
export type TpeTerminalRole = 'BAR' | 'FLOOR';

/**
 * Lifecycle states of an electronic card payment transaction dispatched to a physical TPE.
 */
export type TpeTransactionStatus =
  | 'INITIATED'
  | 'WAITING_CARD'
  | 'PROCESSING'
  | 'APPROVED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'ERROR';

/**
 * Request payload for dispatching a payment transaction to a physical or simulated TPE.
 */
export interface TpePaymentRequest {
  amount?: number;
  montant?: number;
  currencyCode?: string;
  targetRole?: TpeTerminalRole;
  terminalRole?: TpeTerminalRole;
  tableNumber?: string;
  invoiceId?: number;
  serverName?: string;
  terminalIp?: string;
  terminalPort?: number;
  reference?: string;
}

export type TpePaymentRequestDTO = TpePaymentRequest;

/**
 * Data Transfer Object representing the current or final status of a payment terminal transaction.
 */
export interface TpePaymentResponse {
  transactionId: string;
  status: TpeTransactionStatus;
  amount: number;
  currencyCode: string;
  authorizationCode?: string;
  terminalId?: string;
  cardBrand?: string;
  maskedPan?: string;
  sequenceNumber?: string;
  message?: string;
  timestamp: string;
}

export type TpePaymentResponseDTO = TpePaymentResponse;

/**
 * Request payload for testing TCP socket connectivity to a physical payment terminal.
 */
export interface TpeConnectionTestRequest {
  role?: TpeTerminalRole;
  ip?: string;
  port?: number;
  terminalId?: string;
  timeoutSeconds?: number;
}

export type TpeConnectionTestRequestDTO = TpeConnectionTestRequest;

/**
 * Diagnostic outcome of a TCP socket reachability test against a payment terminal.
 */
export interface TpeConnectionTestResponse {
  success: boolean;
  connected?: boolean;
  reachable?: boolean;
  latencyMs?: number;
  ip?: string;
  message: string;
  responseTimeMs?: number;
}

export type TpeConnectionTestResponseDTO = TpeConnectionTestResponse;

/**
 * Public configuration information for staff dashboards about available payment terminals.
 */
export interface TpePublicConfig {
  enabled: boolean;
  simulatorEnabled: boolean;
  barIpConfigured: boolean;
  floorIpConfigured: boolean;
  port: number;
  terminalId: string;
  timeoutSeconds: number;
  terminalsJson?: string;
}
