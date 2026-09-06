import {
  calculateGrossMargin,
  calculateIngredientCost,
  convertUnit,
  getMarginBadgeClass,
  normalizeUnit,
} from '../../../app/core/utils/margin-calculation.util';

describe('Margin Calculation Utilities', () => {
  describe('normalizeUnit', () => {
    it('should return empty string for null, undefined or whitespace', () => {
      expect(normalizeUnit(null)).toBe('');
      expect(normalizeUnit(undefined)).toBe('');
      expect(normalizeUnit('   ')).toBe('');
    });

    it('should trim, lowercase, strip accents, and remove trailing plurals', () => {
      expect(normalizeUnit('  CL  ')).toBe('cl');
      expect(normalizeUnit('Litres')).toBe('litre');
      expect(normalizeUnit('Gouttes')).toBe('goutte');
      expect(normalizeUnit('Tranches')).toBe('tranche');
      expect(normalizeUnit('cs')).toBe('cs');
      expect(normalizeUnit('ds')).toBe('ds');
    });
  });

  describe('convertUnit', () => {
    it('should return 0 for zero or negative quantity', () => {
      expect(convertUnit(0, 'cl', 'l')).toBe(0);
      expect(convertUnit(-5, 'cl', 'l')).toBe(0);
    });

    it('should return original quantity for identical units or empty units', () => {
      expect(convertUnit(5, 'cl', 'cl')).toBe(5);
      expect(convertUnit(5, '', 'cl')).toBe(5);
      expect(convertUnit(5, 'cl', '')).toBe(5);
    });

    it('should accurately convert volume units to liters and between each other', () => {
      // 5 cl to L -> 0.05 L
      expect(convertUnit(5, 'cl', 'l')).toBeCloseTo(0.05, 4);
      // 1 L to cl -> 100 cl
      expect(convertUnit(1, 'l', 'cl')).toBeCloseTo(100, 4);
      // 50 ml to cl -> 5 cl
      expect(convertUnit(50, 'ml', 'cl')).toBeCloseTo(5, 4);
      // 1 dl to cl -> 10 cl
      expect(convertUnit(1, 'dl', 'cl')).toBeCloseTo(10, 4);
      // 2 oz to ml (1 oz = 0.03 L = 30 ml)
      expect(convertUnit(2, 'oz', 'ml')).toBeCloseTo(60, 4);
      // 1 dash to ml (1 dash = 0.001 L = 1 ml)
      expect(convertUnit(1, 'dash', 'ml')).toBeCloseTo(1, 4);
      // 1 tbsp to ml (15 ml)
      expect(convertUnit(1, 'tbsp', 'ml')).toBeCloseTo(15, 4);
      // 1 tsp to ml (5 ml)
      expect(convertUnit(1, 'tsp', 'ml')).toBeCloseTo(5, 4);
    });

    it('should accurately convert mass units', () => {
      // 500 g to kg -> 0.5 kg
      expect(convertUnit(500, 'g', 'kg')).toBeCloseTo(0.5, 4);
      // 1 kg to g -> 1000 g
      expect(convertUnit(1, 'kg', 'g')).toBeCloseTo(1000, 4);
      // 2000 mg to g -> 2 g
      expect(convertUnit(2000, 'mg', 'g')).toBeCloseTo(2, 4);
    });

    it('should fallback to 1:1 for discrete units', () => {
      expect(convertUnit(3, 'tranche', 'piece')).toBe(3);
      expect(convertUnit(2, 'feuille', 'feuille')).toBe(2);
    });
  });

  describe('calculateIngredientCost', () => {
    it('should return 0 when quantity or unit cost is invalid', () => {
      expect(calculateIngredientCost(null, 'cl', 10, 'l')).toBe(0);
      expect(calculateIngredientCost(0, 'cl', 10, 'l')).toBe(0);
      expect(calculateIngredientCost(5, 'cl', null, 'l')).toBe(0);
      expect(calculateIngredientCost(5, 'cl', -10, 'l')).toBe(0);
    });

    it('should calculate cost accurately across unit conversions', () => {
      // 5 cl Rum purchased at 20 €/L => 5 cl = 0.05 L * 20 = 1.00 €
      expect(calculateIngredientCost(5, 'cl', 20, 'l')).toBe(1);

      // 20 g sugar purchased at 2 €/kg => 0.02 kg * 2 = 0.04 €
      expect(calculateIngredientCost(20, 'g', 2, 'kg')).toBe(0.04);

      // 1 slice lemon at 0.15 €/piece => 0.15 €
      expect(calculateIngredientCost(1, 'tranche', 0.15, 'piece')).toBe(0.15);
    });
  });

  describe('calculateGrossMargin', () => {
    it('should return 0 values for null, zero, or invalid inputs', () => {
      const result = calculateGrossMargin(0, 0);
      expect(result.sellingPriceHT).toBe(0);
      expect(result.grossMargin).toBe(0);
      expect(result.grossMarginPercentage).toBe(0);
    });

    it('should calculate pre-tax price, gross margin, and percentage correctly', () => {
      // Selling price 12 € TTC with 20% VAT:
      // HT = 12 / 1.20 = 10.00 €
      // Recipe cost = 1.50 €
      // Margin = 10.00 - 1.50 = 8.50 €
      // Percentage = (8.50 / 10.00) * 100 = 85.0 %
      const result = calculateGrossMargin(12, 1.5, 0.2);
      expect(result.sellingPriceHT).toBe(10);
      expect(result.grossMargin).toBe(8.5);
      expect(result.grossMarginPercentage).toBe(85);
    });

    it('should calculate accurately with custom VAT rates (e.g. 10% food/snack or 0% exempt)', () => {
      // 11 € TTC with 10% VAT -> HT = 10 €, cost = 3 €, margin = 7 €, percentage = 70%
      const res10 = calculateGrossMargin(11, 3, 0.10);
      expect(res10.sellingPriceHT).toBe(10);
      expect(res10.grossMargin).toBe(7);
      expect(res10.grossMarginPercentage).toBe(70);

      // 10 € TTC with 0% VAT -> HT = 10 €, cost = 2.50 €, margin = 7.50 €, percentage = 75%
      const res0 = calculateGrossMargin(10, 2.5, 0);
      expect(res0.sellingPriceHT).toBe(10);
      expect(res0.grossMargin).toBe(7.5);
      expect(res0.grossMarginPercentage).toBe(75);
    });
  });

  describe('getMarginBadgeClass', () => {
    it('should return "success" for margin >= 70%', () => {
      expect(getMarginBadgeClass(70)).toBe('success');
      expect(getMarginBadgeClass(85.5)).toBe('success');
    });

    it('should return "warning" for margin between 50% and 69.99%', () => {
      expect(getMarginBadgeClass(50)).toBe('warning');
      expect(getMarginBadgeClass(69.9)).toBe('warning');
    });

    it('should return "danger" for margin < 50% or null', () => {
      expect(getMarginBadgeClass(49.9)).toBe('danger');
      expect(getMarginBadgeClass(20)).toBe('danger');
      expect(getMarginBadgeClass(null)).toBe('danger');
      expect(getMarginBadgeClass(undefined)).toBe('danger');
    });

    it('should respect custom targetMargin and warningMargin thresholds', () => {
      // Custom: target = 80%, warning = 60%
      expect(getMarginBadgeClass(80, 80, 60)).toBe('success');
      expect(getMarginBadgeClass(75, 80, 60)).toBe('warning');
      expect(getMarginBadgeClass(59, 80, 60)).toBe('danger');
    });
  });
});
