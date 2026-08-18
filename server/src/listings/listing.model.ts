export type ListingStatus = 'pending' | 'oui' | 'peutetre' | 'non';
export type FeedbackSentiment = 'positif' | 'negatif' | null;

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
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  agencyName: string | null;
  url: string;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Date de la dernière synchro ayant réellement changé quelque chose (prix, disparition, vente...) — pas juste "revue à l'identique". */
  updatedAt: string | null;
  status: ListingStatus;
  removedAt: string | null;
  groupId: number;
  groupHistory?: Listing[];
  feedbackSentiment: FeedbackSentiment;
  feedbackNote: string | null;
  showcase: boolean;
}

export interface SyncSummary {
  nouvelles: number;
  misesAJour: number;
  disparues: number;
  total: number;
}
