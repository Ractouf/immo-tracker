import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PriceHistoryEntry } from '../models/listing.model';
import { EmptyPipe } from '../pipes/empty.pipe';
import { distinctPriceHistory } from '../utils/price-history';

@Component({
  selector: 'app-price',
  imports: [CurrencyPipe, DatePipe, EmptyPipe],
  templateUrl: './price.html',
})
export class Price {
  @Input({ required: true }) price: number | null = null;
  @Input() set history(value: PriceHistoryEntry[]) {
    this.entries = distinctPriceHistory(value ?? []);
  }

  entries: PriceHistoryEntry[] = [];

  get highestPrice(): number | null {
    if (this.price === null || this.entries.length === 0) return null;
    const highest = Math.max(...this.entries.map((entry) => entry.price));
    return highest > this.price ? highest : null;
  }
}
