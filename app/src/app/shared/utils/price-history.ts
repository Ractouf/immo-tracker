import { Listing, PriceHistoryEntry } from '../models/listing.model';

export function distinctPriceHistory(history: PriceHistoryEntry[]): PriceHistoryEntry[] {
  return history.filter((entry, i) => i === 0 || entry.price !== history[i - 1].price);
}

export function propertyPriceHistory(listing: Listing): PriceHistoryEntry[] {
  const members = [...(listing.groupHistory ?? []), listing];
  const merged = members.flatMap((member) => member.priceHistory).sort((a, b) => a.date.localeCompare(b.date));
  return distinctPriceHistory(merged);
}
