/**
 * Default UI color themes supported by the application design system.
 */
export type DefaultTheme = 'DARK' | 'LIGHT';
export type CurrencyPosition = 'BEFORE' | 'AFTER';
export type WifiSecurityType = 'WPA' | 'WEP' | 'nopass';

/**
 * Standard measurement unit systems supported by OpenBar for recipes, inventory, and procurement.
 */
export type UnitSystem = 'METRIC_CL' | 'METRIC_ML' | 'IMPERIAL_US' | 'CUSTOM';

/**
 * Commercial discount tier preset for fast register settlement (e.g. staff, VIP, complimentary).
 */
export interface DiscountTier {
  id: string;
  label: string;
  type: 'percent' | 'fixed';
  value: number;
}

export interface AppSettings {
  id: number;
  primaryColor: string;
  primaryColorStrong: string;
  logoUrl: string | null;
  establishmentName: string;
  defaultTheme: DefaultTheme;
  currencyCode?: string;
  currencySymbol?: string;
  currencyPosition?: CurrencyPosition;
  unitSystem?: UnitSystem;
  volumeUnit?: string;
  weightUnit?: string;
  tempsAlerteWarningMinutes?: number;
  tempsAlerteCommandeMinutes?: number;
  tempsAlerteCritiqueCommandeMinutes?: number;
  clientBaseUrl?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiSecurity?: WifiSecurityType;
  wifiEnabled?: boolean;
  tableSessionValidationEnabled?: boolean;
  defaultVatRate?: number;
  targetGrossMarginPercentage?: number;
  warningGrossMarginPercentage?: number;
  barPrinterIp?: string;
  kitchenPrinterIp?: string;
  cashDeskPrinterIp?: string;
  printerPort?: number;
  directPrintingEnabled?: boolean;
  tpeEnabled?: boolean;
  tpeSimulatorEnabled?: boolean;
  tpeBarIp?: string;
  tpeFloorIp?: string;
  tpePort?: number;
  tpeTerminalId?: string;
  tpeTimeoutSeconds?: number;
  cashDenominationsJson?: string;
  discountTiersJson?: string;
  storageLocationsJson?: string;
  printersJson?: string;
  tpeTerminalsJson?: string;
  timeZone?: string;
  updatedAt: string | null;
}

export type AppSettingsUpdateRequest = Omit<AppSettings, 'id' | 'updatedAt'>;

/**
 * Functional role assigned to a network ESC/POS printer.
 */
export type ConfiguredPrinterRole = 'BAR' | 'KITCHEN' | 'CASH_DESK' | 'SNACK' | 'PASS' | 'OTHER';

/**
 * Dynamic configuration for an individual ESC/POS network ticket or kitchen printer.
 */
export interface ConfiguredPrinter {
  id: string;
  name: string;
  ip: string;
  port: number;
  role: ConfiguredPrinterRole;
  paperWidth: 80 | 58;
  openCashDrawer?: boolean;
  enabled: boolean;
}

/**
 * Station role assigned to a Concert / CB IP payment terminal (TPE).
 */
export type ConfiguredTpeRole = 'BAR' | 'FLOOR' | 'REGISTER' | 'TERRACE' | 'OTHER';

/**
 * Dynamic configuration for an individual Concert / CB IP payment terminal (TPE).
 */
export interface ConfiguredTpeTerminal {
  id: string;
  name: string;
  ip: string;
  port: number;
  terminalId: string;
  role: ConfiguredTpeRole;
  timeoutSeconds: number;
  enabled: boolean;
}
