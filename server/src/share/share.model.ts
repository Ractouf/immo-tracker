import { FeedbackSentiment } from '../listings/listing.model';

/** Forme volontairement restreinte : rien qui ne concerne pas la décision du tiers. */
export interface PublicListing {
  immowebId: number;
  title: string;
  price: number | null;
  locality: string | null;
  postalCode: string | null;
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  url: string;
  status: 'oui' | 'peutetre';
  feedbackSentiment: FeedbackSentiment;
  feedbackNote: string | null;
}
