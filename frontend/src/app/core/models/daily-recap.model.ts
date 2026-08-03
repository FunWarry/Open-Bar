export interface PaymentModeSummary {
  modePaiement: string;
  count: number;
  totalTtc: number;
}

export interface VatSummary {
  tauxLabel: string;
  baseHt: number;
  montantTva: number;
  totalTtc: number;
}

export interface DailyRecap {
  date: string;
  totalCaTtc: number;
  totalCaHt: number;
  totalTva: number;
  nombreFacturesReglees: number;
  panierMoyen: number;
  nombreClients: number;
  ventilationModePaiement: PaymentModeSummary[];
  ventilationTva: VatSummary[];
}
