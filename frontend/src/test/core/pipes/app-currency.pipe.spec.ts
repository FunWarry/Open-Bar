import { TestBed } from '@angular/core/testing';
import { AppCurrencyPipe } from '../../../app/core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { BehaviorSubject } from 'rxjs';
import { AppSettings } from '../../../app/core/models/app-settings.model';

describe('AppCurrencyPipe', () => {
  let pipe: AppCurrencyPipe;
  let settingsServiceMock: jasmine.SpyObj<AppSettingsService>;

  beforeEach(() => {
    settingsServiceMock = jasmine.createSpyObj('AppSettingsService', ['formatCurrency'], {
      currencySymbol: '€',
      currencyCode: 'EUR',
      currencyPosition: 'AFTER'
    });

    settingsServiceMock.formatCurrency.and.callFake((value: number | null | undefined, min?: number, max?: number) => {
      const num = value ?? 0;
      const minDigits = min ?? 2;
      const maxDigits = max ?? 2;
      const formatted = num.toFixed(maxDigits).replace('.', ',');
      return `${formatted} €`;
    });

    TestBed.configureTestingModule({
      providers: [
        AppCurrencyPipe,
        { provide: AppSettingsService, useValue: settingsServiceMock }
      ]
    });

    pipe = TestBed.inject(AppCurrencyPipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should delegate formatting to AppSettingsService', () => {
    const result = pipe.transform(15.5);
    expect(settingsServiceMock.formatCurrency).toHaveBeenCalledWith(15.5, 2, 2);
    expect(result).toBe('15,50 €');
  });

  it('should pass custom minFractionDigits and maxFractionDigits', () => {
    pipe.transform(100, 0, 0);
    expect(settingsServiceMock.formatCurrency).toHaveBeenCalledWith(100, 0, 0);
  });

  it('should handle null, undefined, and zero values safely', () => {
    pipe.transform(null);
    expect(settingsServiceMock.formatCurrency).toHaveBeenCalledWith(null, 2, 2);

    pipe.transform(undefined);
    expect(settingsServiceMock.formatCurrency).toHaveBeenCalledWith(undefined, 2, 2);

    pipe.transform(0);
    expect(settingsServiceMock.formatCurrency).toHaveBeenCalledWith(0, 2, 2);
  });
});
