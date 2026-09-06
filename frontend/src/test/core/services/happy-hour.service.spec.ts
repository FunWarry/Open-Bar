import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HappyHourService } from '../../../app/core/services/happy-hour.service';
import { HappyHourRule, HappyHourRuleRequest, PricingPreviewResult } from '../../../app/core/models/happy-hour.model';
import { environment } from '../../../environments/environment';

describe('HappyHourService', () => {
  let service: HappyHourService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/happy-hour`;

  const mockRule: HappyHourRule = {
    id: 1,
    name: 'Afterwork Special',
    startTime: '17:00',
    endTime: '20:00',
    daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    discountType: 'PERCENTAGE',
    discountValue: 20,
    active: true,
    categories: ['COCKTAIL', 'BEER'],
    cocktailIds: [1, 2]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HappyHourService]
    });
    service = TestBed.inject(HappyHourService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAllRules() calls GET /api/happy-hour and updates rules signal', () => {
    service.getAllRules().subscribe(rules => {
      expect(rules).toEqual([mockRule]);
      expect(service.rules()).toEqual([mockRule]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockRule]);
  });

  it('getActiveRules() calls GET /api/happy-hour/active', () => {
    service.getActiveRules().subscribe(rules => {
      expect(rules).toEqual([mockRule]);
    });

    const req = httpMock.expectOne(`${baseUrl}/active`);
    expect(req.request.method).toBe('GET');
    req.flush([mockRule]);
  });

  it('createRule() calls POST /api/happy-hour and adds rule to signal', () => {
    const payload: HappyHourRuleRequest = {
      name: 'Night Discount',
      startTime: '22:00',
      endTime: '02:00',
      daysOfWeek: ['FRIDAY', 'SATURDAY'],
      discountType: 'FIXED_PRICE',
      discountValue: 5.0,
      active: true,
      categories: ['SHOT'],
      cocktailIds: []
    };

    service.createRule(payload).subscribe(created => {
      expect(created.id).toBe(2);
      expect(service.rules()).toHaveSize(1);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 2, ...payload });
  });

  it('updateRule() calls PUT /api/happy-hour/:id and updates rule in signal', () => {
    // Populate initial state in signal
    service['rulesSignal'].set([mockRule]);

    const updatePayload: HappyHourRuleRequest = {
      ...mockRule,
      discountValue: 30
    };

    service.updateRule(1, updatePayload).subscribe(updated => {
      expect(updated.discountValue).toBe(30);
      expect(service.rules()[0].discountValue).toBe(30);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockRule, discountValue: 30 });
  });

  it('deleteRule() calls DELETE /api/happy-hour/:id and removes rule from signal', () => {
    service['rulesSignal'].set([mockRule]);

    service.deleteRule(1).subscribe(() => {
      expect(service.rules()).toHaveSize(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('previewPrice() calls GET /api/happy-hour/preview with correct parameters', () => {
    const mockPreview: PricingPreviewResult = {
      cocktailId: 10,
      cocktailNom: 'Mojito',
      varianteId: 2,
      varianteNom: 'Pitcher',
      basePrice: 20.0,
      effectivePrice: 16.0,
      discountAmount: 4.0,
      discountPercentage: 20,
      isHappyHour: true,
      appliedRuleName: 'Afterwork Special',
      discountType: 'PERCENTAGE',
      discountValue: 20
    };

    service.previewPrice(10, 2, '2026-09-06T18:00:00').subscribe(res => {
      expect(res).toEqual(mockPreview);
    });

    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/preview` &&
      r.params.get('cocktailId') === '10' &&
      r.params.get('varianteId') === '2' &&
      r.params.get('at') === '2026-09-06T18:00:00'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPreview);
  });

  it('simulateRule() calls POST /api/happy-hour/simulate with rule and at param', () => {
    const draftRule: HappyHourRuleRequest = {
      name: 'Simulated Rule',
      startTime: '18:00',
      endTime: '21:00',
      daysOfWeek: ['FRIDAY'],
      discountType: 'PERCENTAGE',
      discountValue: 25,
      active: true,
      categories: ['COCKTAIL'],
      cocktailIds: []
    };

    service.simulateRule(draftRule, '2026-09-11T19:00:00').subscribe(results => {
      expect(results).toHaveSize(1);
    });

    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/simulate` &&
      r.params.get('at') === '2026-09-11T19:00:00'
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(draftRule);
    req.flush([{
      cocktailId: 1,
      cocktailNom: 'Mojito',
      basePrice: 10,
      effectivePrice: 7.5,
      discountAmount: 2.5,
      discountPercentage: 25,
      isHappyHour: true
    }]);
  });

  describe('Discount calculation & strategy', () => {
    it('calculates PERCENTAGE discount correctly and rounds to 2 decimals', () => {
      expect(service.calculateDiscount(10.0, 'PERCENTAGE', 20)).toBe(8.0);
      expect(service.calculateDiscount(9.99, 'PERCENTAGE', 15)).toBe(8.49);
      expect(service.calculateDiscount(10.0, 'PERCENTAGE', 100)).toBe(0.0);
    });

    it('calculates FIXED_PRICE correctly', () => {
      expect(service.calculateDiscount(10.0, 'FIXED_PRICE', 6.5)).toBe(6.5);
      // Fixed price should not exceed base price
      expect(service.calculateDiscount(5.0, 'FIXED_PRICE', 8.0)).toBe(5.0);
    });

    it('calculates FIXED_DISCOUNT correctly and does not drop below 0', () => {
      expect(service.calculateDiscount(10.0, 'FIXED_DISCOUNT', 3.0)).toBe(7.0);
      expect(service.calculateDiscount(4.0, 'FIXED_DISCOUNT', 5.0)).toBe(0.0);
    });
  });

  describe('isRuleApplicableNow with boundary cases', () => {
    it('returns false for inactive rules', () => {
      const inactive = { ...mockRule, active: false };
      expect(service.isRuleApplicableNow(inactive, new Date('2026-09-07T18:00:00'))).toBeFalse();
    });

    it('returns false when day of week does not match', () => {
      // 2026-09-06 is Sunday
      const sundayDate = new Date('2026-09-06T18:00:00');
      expect(service.isRuleApplicableNow(mockRule, sundayDate)).toBeFalse();
    });

    it('handles regular time range boundaries on a valid weekday', () => {
      // 2026-09-07 is Monday
      const mondayBefore = new Date('2026-09-07T16:59:00');
      const mondayStart = new Date('2026-09-07T17:00:00');
      const mondayMid = new Date('2026-09-07T18:30:00');
      const mondayEnd = new Date('2026-09-07T20:00:00');
      const mondayAfter = new Date('2026-09-07T20:01:00');

      expect(service.isRuleApplicableNow(mockRule, mondayBefore)).toBeFalse();
      expect(service.isRuleApplicableNow(mockRule, mondayStart)).toBeTrue();
      expect(service.isRuleApplicableNow(mockRule, mondayMid)).toBeTrue();
      expect(service.isRuleApplicableNow(mockRule, mondayEnd)).toBeTrue();
      expect(service.isRuleApplicableNow(mockRule, mondayAfter)).toBeFalse();
    });

    it('handles overnight rules crossing midnight (e.g. 22:00 to 02:00)', () => {
      const overnightRule: HappyHourRule = {
        id: 2,
        name: 'Late Night Shots',
        startTime: '22:00',
        endTime: '02:00',
        daysOfWeek: ['FRIDAY', 'SATURDAY'],
        discountType: 'FIXED_PRICE',
        discountValue: 3.0,
        active: true,
        categories: ['SHOT'],
        cocktailIds: []
      };

      // Friday 21:59 (before)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-11T21:59:00'))).toBeFalse();
      // Friday 22:00 (start boundary)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-11T22:00:00'))).toBeTrue();
      // Friday 23:45 (active)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-11T23:45:00'))).toBeTrue();
      // Saturday 01:30 (active in overnight window)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-12T01:30:00'))).toBeTrue();
      // Saturday 02:00 (end boundary)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-12T02:00:00'))).toBeTrue();
      // Saturday 02:01 (after)
      expect(service.isRuleApplicableNow(overnightRule, new Date('2026-09-12T02:01:00'))).toBeFalse();
    });
  });

  describe('resolvePrice', () => {
    it('returns regular base price when no rule applies', () => {
      service['rulesSignal'].set([]);
      const result = service.resolvePrice(12.0, 99, 'COCKTAIL');
      expect(result.effectivePrice).toBe(12.0);
      expect(result.isHappyHour).toBeFalse();
      expect(result.savings).toBe(0);
      expect(result.appliedRule).toBeNull();
    });

    it('applies best discount when multiple rules match', () => {
      const rule20Pct: HappyHourRule = {
        id: 1,
        name: '20% Off',
        startTime: '12:00',
        endTime: '23:00',
        daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        discountType: 'PERCENTAGE',
        discountValue: 20,
        active: true,
        categories: ['COCKTAIL'],
        cocktailIds: []
      };

      const rule5Fixed: HappyHourRule = {
        id: 2,
        name: '5 EUR Fixed',
        startTime: '12:00',
        endTime: '23:00',
        daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        discountType: 'FIXED_PRICE',
        discountValue: 5.0,
        active: true,
        categories: ['COCKTAIL'],
        cocktailIds: [10]
      };

      service['rulesSignal'].set([rule20Pct, rule5Fixed]);

      // Base price 10 EUR: 20% off -> 8 EUR; Fixed 5 EUR -> 5 EUR (better deal)
      const result = service.resolvePrice(10.0, 10, 'COCKTAIL', new Date('2026-09-07T14:00:00'));
      expect(result.effectivePrice).toBe(5.0);
      expect(result.isHappyHour).toBeTrue();
      expect(result.savings).toBe(5.0);
      expect(result.appliedRule?.id).toBe(2);
    });

    it('respects cocktail specific scope over general categories', () => {
      const cocktailSpecificRule: HappyHourRule = {
        id: 1,
        name: 'Special Gin Tonic',
        startTime: '10:00',
        endTime: '23:00',
        daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        discountType: 'FIXED_DISCOUNT',
        discountValue: 3.0,
        active: true,
        categories: [],
        cocktailIds: [42]
      };

      service['rulesSignal'].set([cocktailSpecificRule]);

      // Matching cocktail id 42
      const match = service.resolvePrice(10.0, 42, 'COCKTAIL', new Date('2026-09-07T14:00:00'));
      expect(match.isHappyHour).toBeTrue();
      expect(match.effectivePrice).toBe(7.0);

      // Non-matching cocktail id 43
      const nonMatch = service.resolvePrice(10.0, 43, 'COCKTAIL', new Date('2026-09-07T14:00:00'));
      expect(nonMatch.isHappyHour).toBeFalse();
      expect(nonMatch.effectivePrice).toBe(10.0);
    });
  });
});
