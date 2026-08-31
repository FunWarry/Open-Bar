export type DefaultTheme = 'DARK' | 'LIGHT';
export type CurrencyPosition = 'BEFORE' | 'AFTER';
export type WifiSecurityType = 'WPA' | 'WEP' | 'nopass';

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
  tempsAlerteWarningMinutes?: number;
  tempsAlerteCommandeMinutes?: number;
  tempsAlerteCritiqueCommandeMinutes?: number;
  clientBaseUrl?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiSecurity?: WifiSecurityType;
  wifiEnabled?: boolean;
  updatedAt: string | null;
}

export type AppSettingsUpdateRequest = Omit<AppSettings, 'id' | 'updatedAt'>;


