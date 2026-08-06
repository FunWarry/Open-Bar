export interface EstablishmentConfig {
  id?: number;
  legalName: string;
  legalForm: string;
  siret: string;
  rcsCity: string;
  rcsNumber: string;
  tvaNumber: string;
  codeApe: string;
  capitalSocial: number;
  address: string;
  phone: string;
  email: string;
  paymentTerms: string;
  discountPolicy: string;
  latePaymentRate: number;
  timeZone?: string;
  ticketFormat?: '80mm' | '58mm';
  createdAt?: string;
  updatedAt?: string;
}
