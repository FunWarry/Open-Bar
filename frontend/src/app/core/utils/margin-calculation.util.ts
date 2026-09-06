/**
 * Measurement unit conversion and recipe margin calculation utility.
 */

const VOLUME_TO_LITERS: Record<string, number> = {
  l: 1.0,
  dl: 0.1,
  cl: 0.01,
  ml: 0.001,
  oz: 0.03,
  dash: 0.001,
  goutte: 0.0005,
  tsp: 0.005,
  tbsp: 0.015,
};

const MASS_TO_KILOGRAMS: Record<string, number> = {
  kg: 1.0,
  g: 0.001,
  mg: 0.000001,
};

/**
 * Normalizes a unit string by trimming, lowercasing, stripping accents, and removing trailing 's'.
 *
 * @param unit raw unit label
 * @returns normalized unit
 */
export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  let norm = unit
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('.', '')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (norm.endsWith('s') && norm.length > 2 && norm !== 'cs' && norm !== 'ds') {
    norm = norm.slice(0, -1);
  }
  return norm;
}

/**
 * Converts a quantity from one measurement unit to another.
 *
 * @param quantity value to convert
 * @param fromUnit source unit
 * @param toUnit target unit
 * @returns converted value
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (!quantity || quantity <= 0) return 0;
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (!normFrom || !normTo || normFrom === normTo) {
    return quantity;
  }

  // Volume conversion
  if (normFrom in VOLUME_TO_LITERS && normTo in VOLUME_TO_LITERS) {
    const inLiters = quantity * VOLUME_TO_LITERS[normFrom];
    return inLiters / VOLUME_TO_LITERS[normTo];
  }

  // Mass conversion
  if (normFrom in MASS_TO_KILOGRAMS && normTo in MASS_TO_KILOGRAMS) {
    const inKg = quantity * MASS_TO_KILOGRAMS[normFrom];
    return inKg / MASS_TO_KILOGRAMS[normTo];
  }

  // Fallback 1:1
  return quantity;
}

/**
 * Calculates the line cost for a recipe ingredient.
 *
 * @param recipeQuantity quantity specified in the cocktail recipe
 * @param recipeUnit unit used in the recipe
 * @param ingredientUnitCost unit purchase cost of the ingredient
 * @param ingredientUnit unit corresponding to the purchase cost
 * @returns total line cost rounded to 4 decimals
 */
export function calculateIngredientCost(
  recipeQuantity: number | null | undefined,
  recipeUnit: string | null | undefined,
  ingredientUnitCost: number | null | undefined,
  ingredientUnit: string | null | undefined
): number {
  if (!recipeQuantity || !ingredientUnitCost || recipeQuantity <= 0 || ingredientUnitCost <= 0) {
    return 0;
  }
  const convertedQty = convertUnit(recipeQuantity, recipeUnit || 'cl', ingredientUnit || 'L');
  const cost = convertedQty * ingredientUnitCost;
  return Math.round(cost * 10000) / 10000;
}

/**
 * Computes financial margin metrics for a drink.
 *
 * @param sellingPriceTtc VAT-inclusive selling price
 * @param recipeCost total recipe cost
 * @param vatRate default VAT rate (0.20 for 20%)
 * @returns object containing sellingPriceHT, grossMargin, and grossMarginPercentage
 */
export function calculateGrossMargin(
  sellingPriceTtc: number | null | undefined,
  recipeCost: number | null | undefined,
  vatRate = 0.20
): {
  sellingPriceHT: number;
  grossMargin: number;
  grossMarginPercentage: number;
} {
  const ttc = sellingPriceTtc && sellingPriceTtc > 0 ? sellingPriceTtc : 0;
  const cost = recipeCost && recipeCost > 0 ? recipeCost : 0;
  const sellingPriceHT = Math.round((ttc / (1 + vatRate)) * 100) / 100;
  const grossMargin = Math.round((sellingPriceHT - cost) * 100) / 100;
  const grossMarginPercentage =
    sellingPriceHT > 0 ? Math.round((grossMargin / sellingPriceHT) * 1000) / 10 : 0;

  return {
    sellingPriceHT,
    grossMargin,
    grossMarginPercentage,
  };
}

/**
 * Returns badge semantic CSS class based on cocktail gross margin percentage.
 * Target benchmarks: >= targetMargin is excellent ('success'), >= warningMargin is moderate ('warning'), else low ('danger').
 *
 * @param marginPercentage margin percentage
 * @param targetMargin target gross margin percentage (default: 70)
 * @param warningMargin warning gross margin percentage threshold (default: 50)
 * @returns 'success' | 'warning' | 'danger'
 */
export function getMarginBadgeClass(
  marginPercentage: number | null | undefined,
  targetMargin: number = 70,
  warningMargin: number = 50
): 'success' | 'warning' | 'danger' {
  if (marginPercentage !== null && marginPercentage !== undefined) {
    if (marginPercentage >= targetMargin) return 'success';
    if (marginPercentage >= warningMargin) return 'warning';
  }
  return 'danger';
}
