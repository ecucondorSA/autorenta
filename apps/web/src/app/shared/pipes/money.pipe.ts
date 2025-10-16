import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'ARS'): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
