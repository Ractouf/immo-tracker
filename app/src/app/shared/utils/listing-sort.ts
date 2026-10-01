import { Listing } from '../models/listing.model';
import { propertyPriceHistory } from './price-history';

export type ListingSort = 'recent' | 'priceAsc' | 'priceDesc' | 'pricePerSqmAsc' | 'pricePerSqmDesc' | 'surfaceAsc' | 'surfaceDesc' | 'priceDrop' | 'oldest';

export const LISTING_SORT_OPTIONS: { id: ListingSort; value: string }[] = [
  { id: 'recent', value: 'Plus récentes' },
  { id: 'priceAsc', value: 'Prix croissant' },
  { id: 'priceDesc', value: 'Prix décroissant' },
  { id: 'pricePerSqmAsc', value: 'Prix au m² croissant' },
  { id: 'pricePerSqmDesc', value: 'Prix au m² décroissant' },
  { id: 'surfaceAsc', value: 'Surface croissante' },
  { id: 'surfaceDesc', value: 'Surface décroissante' },
  { id: 'priceDrop', value: 'Plus grosse baisse de prix' },
  { id: 'oldest', value: 'Première apparition' },
];

const SORT_KEYS: Record<Exclude<ListingSort, 'recent'>, { key: (l: Listing) => number | string | null; direction: 1 | -1 }> = {
  priceAsc: { key: (l) => l.price, direction: 1 },
  priceDesc: { key: (l) => l.price, direction: -1 },
  pricePerSqmAsc: { key: pricePerSqm, direction: 1 },
  pricePerSqmDesc: { key: pricePerSqm, direction: -1 },
  surfaceAsc: { key: (l) => l.netHabitableSurface, direction: 1 },
  surfaceDesc: { key: (l) => l.netHabitableSurface, direction: -1 },
  priceDrop: { key: priceDrop, direction: -1 },
  oldest: { key: (l) => l.firstSeenAt, direction: 1 },
};

export function sortListings(listings: Listing[], sort: ListingSort): Listing[] {
  if (sort === 'recent') return listings;

  const { key, direction } = SORT_KEYS[sort];
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
