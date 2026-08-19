export type DefaultTheme = 'DARK' | 'LIGHT';

export interface AppSettings {
  id: number;
  primaryColor: string;
  primaryColorStrong: string;
  logoUrl: string | null;
  establishmentName: string;
  defaultTheme: DefaultTheme;
  tempsAlerteWarningMinutes?: number;
  tempsAlerteCommandeMinutes?: number;
  tempsAlerteCritiqueCommandeMinutes?: number;
  updatedAt: string | null;
}

export type AppSettingsUpdateRequest = Omit<AppSettings, 'id' | 'updatedAt'>;
