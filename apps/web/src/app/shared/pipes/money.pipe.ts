import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  /**
   * Format a number as currency.
   * Default is USD (platform base currency).
   * Use 'ARS' for payment display.
   */
  transform(value: number | null | undefined, currency = 'USD'): string {
    if (value === null || value === undefined) {
      return '-';
    }

    // Use appropriate locale based on currency
    const locale = currency === 'ARS' ? 'es-AR' : 'en-US';

    // For USD, use explicit "US$" or "USD" to avoid confusion with ARS "$"
    if (currency === 'USD') {
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      return `USD ${formatted}`;
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
