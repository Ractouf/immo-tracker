import { formatCurrency } from '@angular/common';
import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

export function formatPrice(value: number | null | undefined, locale: string): string {
  return value === null || value === undefined ? '-' : formatCurrency(value, locale, '€', 'EUR', '1.0-0');
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  transform(value: number | null | undefined): string {
    return formatPrice(value, this.locale);
  }
}
