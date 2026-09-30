export type ImmowebPropertyType = 'house' | 'apartment' | 'house-and-apartment';

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
];

export function immowebSearchSummary(search: ImmowebSearch): string {
  const format = (n: number) => new Intl.NumberFormat('fr-BE').format(n) + ' €';
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
