/**
 * Workstation role for ESC/POS thermal printers.
 */
export type PrinterRole = 'BAR' | 'KITCHEN' | 'CASH_DESK';

/**
 * Current LAN printer status and configuration summary.
 */
export interface PrinterStatus {
  directPrintingEnabled: boolean;
  barPrinterIp?: string;
  kitchenPrinterIp?: string;
  cashDeskPrinterIp?: string;
  printerPort: number;
}

/**
 * Result report for an ESC/POS socket print attempt.
 */
export interface PrintResult {
  success: boolean;
  role?: string | null;
  ip?: string;
  port: number;
  message: string;
  durationMs: number;
}

/**
 * Payload for testing raw network printer connectivity to a given IP and port.
 */
export interface PrinterConnectionTestRequest {
  ip: string;
  port?: number;
  role?: PrinterRole;
}
