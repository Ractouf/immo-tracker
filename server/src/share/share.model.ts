import { FeedbackSentiment } from '../listings/listing.model';

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
  feedbackSentiment: FeedbackSentiment;
  feedbackNote: string | null;
}
