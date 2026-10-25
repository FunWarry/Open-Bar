import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DenominationCalculatorComponent } from '../../../../app/core/components/ui/denomination-calculator/denomination-calculator.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { CashDenomination } from '../../../../app/core/models/cash-denomination.model';

describe('DenominationCalculatorComponent', () => {
  let component: DenominationCalculatorComponent;
  let fixture: ComponentFixture<DenominationCalculatorComponent>;

  const mockAppSettingsService = {
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyPosition: 'AFTER' as const,
    getCashDenominations: () => null,
    formatCurrency: (value: number | null | undefined) => `${(value ?? 0).toFixed(2)} €`
  };

  const customDenominations: CashDenomination[] = [
    { key: '50e', label: '50 €', value: 50.0, type: 'bill' },
    { key: '20e', label: '20 €', value: 20.0, type: 'bill' },
    { key: '2e', label: '2 €', value: 2.0, type: 'coin' },
    { key: '1e', label: '1 €', value: 1.0, type: 'coin' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DenominationCalculatorComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: AppSettingsService, useValue: mockAppSettingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DenominationCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default Euro denominations', () => {
    expect(component).toBeTruthy();
    expect(component.bills.length).toBeGreaterThan(0);
    expect(component.coins.length).toBeGreaterThan(0);
    expect(component.grandTotal).toBe(0);
  });

  it('should accept custom denominations input', () => {
    component.denominations = customDenominations;
    component.ngOnChanges({
      denominations: {
        currentValue: customDenominations,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    expect(component.bills).toHaveSize(2);
    expect(component.coins).toHaveSize(2);
    expect(component.counting['50e']).toBe(0);
    expect(component.counting['2e']).toBe(0);
  });

  it('should adjust counts up and down and clamp at zero', () => {
    spyOn(component.countingChange, 'emit');
    spyOn(component.totalChange, 'emit');

    component.denominations = customDenominations;
    component.ngOnChanges({
      denominations: {
        currentValue: customDenominations,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    // Increment 50e by 1
    component.adjustCount('50e', 1);
    expect(component.counting['50e']).toBe(1);
    expect(component.billsTotal).toBe(50);
    expect(component.grandTotal).toBe(50);
    expect(component.countingChange.emit).toHaveBeenCalled();
    expect(component.totalChange.emit).toHaveBeenCalledWith(50);

    // Increment 2e by 3
    component.adjustCount('2e', 3);
    expect(component.counting['2e']).toBe(3);
    expect(component.coinsTotal).toBe(6);
    expect(component.grandTotal).toBe(56);

    // Decrement 50e by 2 (should floor at 0)
    component.adjustCount('50e', -2);
    expect(component.counting['50e']).toBe(0);
    expect(component.billsTotal).toBe(0);
    expect(component.grandTotal).toBe(6);
  });

  it('should handle direct text input and parse safely', () => {
    component.denominations = customDenominations;
    component.ngOnChanges({
      denominations: {
        currentValue: customDenominations,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    component.onCountInput('20e', '4');
    expect(component.counting['20e']).toBe(4);
    expect(component.billsTotal).toBe(80);

    // Invalid non-numeric input should be clamped to 0
    component.onCountInput('20e', 'invalid');
    expect(component.counting['20e']).toBe(0);
    expect(component.billsTotal).toBe(0);
  });

  it('should reset all counts to zero when resetCounts is called', () => {
    component.denominations = customDenominations;
    component.counting = { '50e': 2, '20e': 5, '2e': 10, '1e': 15 };

    expect(component.grandTotal).toBe(235);

    component.resetCounts();

    expect(component.counting['50e']).toBe(0);
    expect(component.counting['20e']).toBe(0);
    expect(component.counting['2e']).toBe(0);
    expect(component.counting['1e']).toBe(0);
    expect(component.grandTotal).toBe(0);
  });

  it('should not mutate counts when readOnly is true', () => {
    component.readOnly = true;
    component.counting = { '50e': 2 };

    component.adjustCount('50e', 1);
    expect(component.counting['50e']).toBe(2);

    component.onCountInput('50e', '10');
    expect(component.counting['50e']).toBe(2);

    component.resetCounts();
    expect(component.counting['50e']).toBe(2);
  });

  it('should calculate line totals correctly', () => {
    const item = customDenominations[0]; // 50e
    component.counting = { '50e': 7 };

    expect(component.getLineTotal(item)).toBe(350);
  });
});
