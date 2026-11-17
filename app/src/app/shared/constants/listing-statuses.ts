import { ListingStatus } from '../models/listing.model';

export type ListingCategory = ListingStatus | 'removed';

type StatusClasses = { button: string; border: string; pinBg: string; pinBorder: string };

type CategoryDefinition<C extends ListingCategory> = { label: string; slug: string } & (C extends ListingStatus ? { classes: StatusClasses } : {});

export const LISTING_STATUSES: { [C in ListingCategory]: CategoryDefinition<C> } = {
  pending: {
    label: 'À trier',
    slug: 'pending',
    classes: { button: 'secondary', border: 'border-gray-200', pinBg: 'bg-blue-600', pinBorder: 'border-blue-600' },
  },
  oui: {
    label: 'Oui',
    slug: 'yes',
    classes: { button: 'green', border: 'border-emerald-500', pinBg: 'bg-emerald-600', pinBorder: 'border-emerald-600' },
  },
  peutetre: {
    label: 'Peut-être',
    slug: 'maybe',
    classes: { button: 'amber', border: 'border-amber-500', pinBg: 'bg-amber-500', pinBorder: 'border-amber-500' },
  },
  non: {
    label: 'Non',
    slug: 'no',
    classes: { button: 'gray', border: 'border-gray-400', pinBg: 'bg-gray-500', pinBorder: 'border-gray-500' },
  },
  removed: {
    label: 'Disparues',
    slug: 'removed',
  },
};

export const LISTING_CATEGORIES = Object.keys(LISTING_STATUSES) as ListingCategory[];
