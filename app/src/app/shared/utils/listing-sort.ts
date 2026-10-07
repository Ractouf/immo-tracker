import { Listing } from '../models/listing.model';
import { PEB_ORDER } from '../peb-badge/peb-badge';
import { propertyPriceHistory } from './price-history';

export type ListingSortField = 'recent' | 'price' | 'pricePerSqm' | 'surface' | 'peb' | 'priceDrop' | 'firstSeen' | 'history';
export type SortDirection = 1 | -1;

export const LISTING_SORT_FIELDS: { id: ListingSortField; value: string; defaultDirection: SortDirection }[] = [
  { id: 'recent', value: 'Mise à jour', defaultDirection: -1 },
  { id: 'price', value: 'Prix', defaultDirection: 1 },
  { id: 'pricePerSqm', value: 'Prix au m²', defaultDirection: 1 },
  { id: 'surface', value: 'Surface', defaultDirection: -1 },
  { id: 'peb', value: 'PEB', defaultDirection: 1 },
  { id: 'priceDrop', value: 'Baisse de prix', defaultDirection: -1 },
  { id: 'firstSeen', value: 'Première apparition', defaultDirection: 1 },
  { id: 'history', value: 'Historique', defaultDirection: -1 },
];

const SORT_KEYS: Record<Exclude<ListingSortField, 'recent'>, (l: Listing) => number | string | null> = {
  price: (l) => l.price,
  pricePerSqm,
  surface: (l) => l.netHabitableSurface,
  peb: (l) => (l.peb && PEB_ORDER.includes(l.peb) ? PEB_ORDER.indexOf(l.peb) : null),
  priceDrop,
  firstSeen: (l) => l.firstSeenAt,
  history: (l) => l.groupHistory?.length ?? 0,
};

export function sortListings(listings: Listing[], field: ListingSortField, direction: SortDirection): Listing[] {
  if (field === 'recent') return direction === -1 ? listings : [...listings].reverse();

  const key = SORT_KEYS[field];
  return listings
    .map((listing) => ({ listing, value: key(listing) }))
    .sort((a, b) => {
      if (a.value === null) return b.value === null ? 0 : 1;
      if (b.value === null) return -1;
      return (a.value < b.value ? -1 : a.value > b.value ? 1 : 0) * direction;
    })
    .map(({ listing }) => listing);
}

function pricePerSqm(listing: Listing): number | null {
  return listing.price !== null && listing.netHabitableSurface ? listing.price / listing.netHabitableSurface : null;
}

function priceDrop(listing: Listing): number | null {
  if (listing.price === null) return null;
  const highest = Math.max(...propertyPriceHistory(listing).map((entry) => entry.price), listing.price);
  return (highest - listing.price) / highest;
}
