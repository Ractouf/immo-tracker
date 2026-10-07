export type ListingStatus = 'pending' | 'oui' | 'peutetre' | 'non';

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

export interface Listing {
  immowebId: number;
  title: string;
  price: number | null;
  priceHistory: PriceHistoryEntry[];
  propertyType: string | null;
  subtype: string | null;
  locality: string | null;
  postalCode: string | null;
  street: string | null;
  houseNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  agencyName: string | null;
  peb: string | null;
  url: string;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string | null;
  status: ListingStatus;
  removedAt: string | null;
  groupId: number;
  groupHistory?: Listing[];
  toVisit: boolean;
  ownerNote: string | null;
  searchIds?: string[];
}

export interface SyncSummary {
  nouvelles: number;
  misesAJour: number;
  disparues: number;
  total: number;
}
