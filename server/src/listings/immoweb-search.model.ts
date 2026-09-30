import { BadRequestException } from '@nestjs/common';

export type ImmowebPropertyType = 'house' | 'apartment' | 'house-and-apartment';

export interface ImmowebSearch {
  id: string;
  propertyType: ImmowebPropertyType;
  postalCodes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minBedroomCount: number | null;
}

const PROPERTY_TYPES: ImmowebPropertyType[] = ['house', 'apartment', 'house-and-apartment'];

export function parseImmowebSearches(body: unknown): ImmowebSearch[] {
  const searches = (body as { searches?: unknown })?.searches;
  if (!Array.isArray(searches) || searches.length === 0) {
    throw new BadRequestException('Aucune recherche Immoweb active');
  }

  return searches.map((raw: any): ImmowebSearch => {
    if (typeof raw?.id !== 'string' || !raw.id) throw new BadRequestException('Recherche sans identifiant');
    if (!PROPERTY_TYPES.includes(raw.propertyType)) throw new BadRequestException(`Type de bien invalide : ${raw.propertyType}`);

    const postalCodes = Array.isArray(raw.postalCodes) ? raw.postalCodes.map(String) : [];
    if (postalCodes.length === 0 || postalCodes.some((code: string) => !/^\d{4}$/.test(code))) {
      throw new BadRequestException('Codes postaux invalides');
    }

    return {
      id: raw.id,
      propertyType: raw.propertyType,
      postalCodes,
      minPrice: toNumberOrNull(raw.minPrice),
      maxPrice: toNumberOrNull(raw.maxPrice),
      minBedroomCount: toNumberOrNull(raw.minBedroomCount),
    };
  });
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) throw new BadRequestException(`Valeur numérique invalide : ${value}`);
  return num;
}
