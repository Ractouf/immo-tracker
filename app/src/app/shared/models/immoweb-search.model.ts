import { formatPrice } from '../pipes/price.pipe';

export type ImmowebPropertyType = 'house' | 'apartment' | 'house-and-apartment' | 'apartment-block';

export interface ImmowebSearch {
  id: string;
  name: string;
  active: boolean;
  propertyType: ImmowebPropertyType;
  postalCodes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minBedroomCount: number | null;
}

export const PROPERTY_TYPE_OPTIONS: { id: ImmowebPropertyType; value: string }[] = [
  { id: 'house', value: 'Maison' },
  { id: 'apartment', value: 'Appartement' },
  { id: 'house-and-apartment', value: 'Maison & appartement' },
  { id: 'apartment-block', value: 'Immeuble de rapport' },
];

export function immowebSearchSummary(search: ImmowebSearch, locale: string): string {
  const format = (n: number) => formatPrice(n, locale);
  const parts = [
    PROPERTY_TYPE_OPTIONS.find((o) => o.id === search.propertyType)?.value ?? search.propertyType,
    search.postalCodes.join(', '),
  ];
  if (search.minPrice !== null && search.maxPrice !== null) parts.push(`${format(search.minPrice)} – ${format(search.maxPrice)}`);
  else if (search.minPrice !== null) parts.push(`≥ ${format(search.minPrice)}`);
  else if (search.maxPrice !== null) parts.push(`≤ ${format(search.maxPrice)}`);
  if (search.minBedroomCount !== null) parts.push(`${search.minBedroomCount}+ ch.`);
  return parts.join(' · ');
}
