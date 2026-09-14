/**
 * Cash denomination entity for cash register physical drawer counting.
 */
export interface CashDenomination {
  /** Unique key identifying the denomination (e.g. '500e', '100usd', 'coin_2e'). */
  key: string;
  /** Human-readable display label (e.g. '500 €', '$ 100'). */
  label: string;
  /** Face value as numeric amount (e.g. 500, 100, 0.50). */
  value: number;
  /** Denomination category: physical paper banknote ('bill') or metal coin ('coin'). */
  type: 'bill' | 'coin';
}

/**
 * Standard official Euro (€) denominations including all official ECB banknotes and coins.
 */
export const DEFAULT_EUR_DENOMINATIONS: CashDenomination[] = [
  { key: '500e', label: '500 €', value: 500.0, type: 'bill' },
  { key: '200e', label: '200 €', value: 200.0, type: 'bill' },
  { key: '100e', label: '100 €', value: 100.0, type: 'bill' },
  { key: '50e', label: '50 €', value: 50.0, type: 'bill' },
  { key: '20e', label: '20 €', value: 20.0, type: 'bill' },
  { key: '10e', label: '10 €', value: 10.0, type: 'bill' },
  { key: '5e', label: '5 €', value: 5.0, type: 'bill' },
  { key: '2e', label: '2 €', value: 2.0, type: 'coin' },
  { key: '1e', label: '1 €', value: 1.0, type: 'coin' },
  { key: '050e', label: '0.50 €', value: 0.50, type: 'coin' },
  { key: '020e', label: '0.20 €', value: 0.20, type: 'coin' },
  { key: '010e', label: '0.10 €', value: 0.10, type: 'coin' },
  { key: '005e', label: '0.05 €', value: 0.05, type: 'coin' },
  { key: '002e', label: '0.02 €', value: 0.02, type: 'coin' },
  { key: '001e', label: '0.01 €', value: 0.01, type: 'coin' },
];

/**
 * Standard official US Dollar ($) denominations.
 */
export const DEFAULT_USD_DENOMINATIONS: CashDenomination[] = [
  { key: '100usd', label: '$ 100', value: 100.0, type: 'bill' },
  { key: '50usd', label: '$ 50', value: 50.0, type: 'bill' },
  { key: '20usd', label: '$ 20', value: 20.0, type: 'bill' },
  { key: '10usd', label: '$ 10', value: 10.0, type: 'bill' },
  { key: '5usd', label: '$ 5', value: 5.0, type: 'bill' },
  { key: '2usd', label: '$ 2', value: 2.0, type: 'bill' },
  { key: '1usd', label: '$ 1', value: 1.0, type: 'bill' },
  { key: '1usd_coin', label: '$ 1 (Pièce)', value: 1.0, type: 'coin' },
  { key: '050usd', label: '$ 0.50', value: 0.50, type: 'coin' },
  { key: '025usd', label: '$ 0.25', value: 0.25, type: 'coin' },
  { key: '010usd', label: '$ 0.10', value: 0.10, type: 'coin' },
  { key: '005usd', label: '$ 0.05', value: 0.05, type: 'coin' },
  { key: '001usd', label: '$ 0.01', value: 0.01, type: 'coin' },
];

/**
 * Standard official British Pound (£) denominations.
 */
export const DEFAULT_GBP_DENOMINATIONS: CashDenomination[] = [
  { key: '50gbp', label: '£ 50', value: 50.0, type: 'bill' },
  { key: '20gbp', label: '£ 20', value: 20.0, type: 'bill' },
  { key: '10gbp', label: '£ 10', value: 10.0, type: 'bill' },
  { key: '5gbp', label: '£ 5', value: 5.0, type: 'bill' },
  { key: '2gbp', label: '£ 2', value: 2.0, type: 'coin' },
  { key: '1gbp', label: '£ 1', value: 1.0, type: 'coin' },
  { key: '050gbp', label: '£ 0.50', value: 0.50, type: 'coin' },
  { key: '020gbp', label: '£ 0.20', value: 0.20, type: 'coin' },
  { key: '010gbp', label: '£ 0.10', value: 0.10, type: 'coin' },
  { key: '005gbp', label: '£ 0.05', value: 0.05, type: 'coin' },
  { key: '002gbp', label: '£ 0.02', value: 0.02, type: 'coin' },
  { key: '001gbp', label: '£ 0.01', value: 0.01, type: 'coin' },
];

/**
 * Standard official Swiss Franc (CHF) denominations.
 */
export const DEFAULT_CHF_DENOMINATIONS: CashDenomination[] = [
  { key: '1000chf', label: '1000 CHF', value: 1000.0, type: 'bill' },
  { key: '200chf', label: '200 CHF', value: 200.0, type: 'bill' },
  { key: '100chf', label: '100 CHF', value: 100.0, type: 'bill' },
  { key: '50chf', label: '50 CHF', value: 50.0, type: 'bill' },
  { key: '20chf', label: '20 CHF', value: 20.0, type: 'bill' },
  { key: '10chf', label: '10 CHF', value: 10.0, type: 'bill' },
  { key: '5chf', label: '5 CHF', value: 5.0, type: 'coin' },
  { key: '2chf', label: '2 CHF', value: 2.0, type: 'coin' },
  { key: '1chf', label: '1 CHF', value: 1.0, type: 'coin' },
  { key: '050chf', label: '0.50 CHF', value: 0.50, type: 'coin' },
  { key: '020chf', label: '0.20 CHF', value: 0.20, type: 'coin' },
  { key: '010chf', label: '0.10 CHF', value: 0.10, type: 'coin' },
  { key: '005chf', label: '0.05 CHF', value: 0.05, type: 'coin' },
];

/**
 * Standard official Canadian Dollar ($ CAD) denominations.
 */
export const DEFAULT_CAD_DENOMINATIONS: CashDenomination[] = [
  { key: '100cad', label: '$ 100', value: 100.0, type: 'bill' },
  { key: '50cad', label: '$ 50', value: 50.0, type: 'bill' },
  { key: '20cad', label: '$ 20', value: 20.0, type: 'bill' },
  { key: '10cad', label: '$ 10', value: 10.0, type: 'bill' },
  { key: '5cad', label: '$ 5', value: 5.0, type: 'bill' },
  { key: '2cad', label: '$ 2 (Toonie)', value: 2.0, type: 'coin' },
  { key: '1cad', label: '$ 1 (Loonie)', value: 1.0, type: 'coin' },
  { key: '025cad', label: '$ 0.25', value: 0.25, type: 'coin' },
  { key: '010cad', label: '$ 0.10', value: 0.10, type: 'coin' },
  { key: '005cad', label: '$ 0.05', value: 0.05, type: 'coin' },
];

/**
 * Standard official Japanese Yen (¥ JPY) denominations.
 */
export const DEFAULT_JPY_DENOMINATIONS: CashDenomination[] = [
  { key: '10000jpy', label: '¥ 10 000', value: 10000.0, type: 'bill' },
  { key: '5000jpy', label: '¥ 5 000', value: 5000.0, type: 'bill' },
  { key: '2000jpy', label: '¥ 2 000', value: 2000.0, type: 'bill' },
  { key: '1000jpy', label: '¥ 1 000', value: 1000.0, type: 'bill' },
  { key: '500jpy', label: '¥ 500', value: 500.0, type: 'coin' },
  { key: '100jpy', label: '¥ 100', value: 100.0, type: 'coin' },
  { key: '50jpy', label: '¥ 50', value: 50.0, type: 'coin' },
  { key: '10jpy', label: '¥ 10', value: 10.0, type: 'coin' },
  { key: '5jpy', label: '¥ 5', value: 5.0, type: 'coin' },
  { key: '1jpy', label: '¥ 1', value: 1.0, type: 'coin' },
];

/**
 * Standard official Australian Dollar ($ AUD) denominations.
 */
export const DEFAULT_AUD_DENOMINATIONS: CashDenomination[] = [
  { key: '100aud', label: '$ 100', value: 100.0, type: 'bill' },
  { key: '50aud', label: '$ 50', value: 50.0, type: 'bill' },
  { key: '20aud', label: '$ 20', value: 20.0, type: 'bill' },
  { key: '10aud', label: '$ 10', value: 10.0, type: 'bill' },
  { key: '5aud', label: '$ 5', value: 5.0, type: 'bill' },
  { key: '2aud', label: '$ 2', value: 2.0, type: 'coin' },
  { key: '1aud', label: '$ 1', value: 1.0, type: 'coin' },
  { key: '050aud', label: '$ 0.50', value: 0.50, type: 'coin' },
  { key: '020aud', label: '$ 0.20', value: 0.20, type: 'coin' },
  { key: '010aud', label: '$ 0.10', value: 0.10, type: 'coin' },
  { key: '005aud', label: '$ 0.05', value: 0.05, type: 'coin' },
];

/**
 * Map of default currency preset denominations by ISO 4217 currency code.
 */
export const CURRENCY_DEFAULT_DENOMINATIONS: Record<string, CashDenomination[]> = {
  EUR: DEFAULT_EUR_DENOMINATIONS,
  USD: DEFAULT_USD_DENOMINATIONS,
  GBP: DEFAULT_GBP_DENOMINATIONS,
  CHF: DEFAULT_CHF_DENOMINATIONS,
  CAD: DEFAULT_CAD_DENOMINATIONS,
  JPY: DEFAULT_JPY_DENOMINATIONS,
  AUD: DEFAULT_AUD_DENOMINATIONS,
};

/**
 * Generates default denominations for a given currency code, symbol, and symbol position.
 * If currency has a pre-configured official set, returns a cloned copy.
 * Otherwise, generates a standard generic decimal set.
 *
 * @param currencyCode ISO 4217 code (e.g. 'EUR', 'USD', 'SEK')
 * @param currencySymbol Currency symbol (e.g. '€', '$', 'kr')
 * @param position Symbol placement ('BEFORE' or 'AFTER')
 * @returns Array of sorted denominations
 */
export function getDefaultDenominationsForCurrency(
  currencyCode = 'EUR',
  currencySymbol = '€',
  position: 'BEFORE' | 'AFTER' = 'AFTER'
): CashDenomination[] {
  const code = (currencyCode || 'EUR').trim().toUpperCase();
  const existing = CURRENCY_DEFAULT_DENOMINATIONS[code];

  if (existing) {
    return existing.map(d => ({ ...d }));
  }

  // Generic decimal template
  const genericBills = [100, 50, 20, 10, 5];
  const genericCoins = [2, 1, 0.50, 0.20, 0.10, 0.05];

  const format = (v: number): string => {
    const formatted = v >= 1 ? v.toString() : v.toFixed(2);
    return position === 'BEFORE' ? `${currencySymbol} ${formatted}` : `${formatted} ${currencySymbol}`;
  };

  const bills: CashDenomination[] = genericBills.map(v => ({
    key: `bill_${v}_${code.toLowerCase()}`,
    label: format(v),
    value: v,
    type: 'bill' as const
  }));

  const coins: CashDenomination[] = genericCoins.map(v => ({
    key: `coin_${v.toString().replace('.', '')}_${code.toLowerCase()}`,
    label: format(v),
    value: v,
    type: 'coin' as const
  }));

  return [...bills, ...coins];
}
