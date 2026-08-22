import { inject, Pipe, PipeTransform } from '@angular/core';
import { AppSettingsService } from '../services/app-settings.service';

/**
 * Custom pipe for formatting numeric values according to the establishment's configured currency.
 * Pure: false ensures immediate updates across all components when currency settings change.
 */
@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly appSettingsService = inject(AppSettingsService, { optional: true });

  /**
   * Transforms a number into a formatted currency string using configured symbol and position.
   *
   * @param value Amount to format
   * @param minFractionDigits Minimum number of fraction digits (default: 2)
   * @param maxFractionDigits Maximum number of fraction digits (default: 2)
   * @returns Formatted currency string (e.g., "12,50 €" or "$ 12,50")
   */
  transform(value: number | null | undefined, minFractionDigits: number = 2, maxFractionDigits: number = 2): string {
    if (this.appSettingsService) {
      return this.appSettingsService.formatCurrency(value, minFractionDigits, maxFractionDigits);
    }
    const num = (value == null || Number.isNaN(Number(value))) ? 0 : Number(value);
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(num);
    return `${formatted} €`;
  }
}
