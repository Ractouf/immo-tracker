import { Listing } from '../models/listing.model';

export interface MergeSuggestion {
  listing: Listing;
  score: number;
  reasons: string[];
}

const DAY = 24 * 60 * 60 * 1000;
const GENERIC_WORDS = new Set(['sans', 'titre', 'house', 'maison', 'huis', 'woning', 'sale', 'vendre', 'with', 'avec', 'pour', 'property', 'investment', 'building', 'brussels', 'bruxelles', 'brussel']);

export function isPossibleMatch(source: Listing, candidate: Listing): boolean {
  if (candidate.postalCode !== source.postalCode) return false;
  if (source.price === null || candidate.price === null) return true;
  const [earlier, later] = candidate.firstSeenAt <= source.firstSeenAt ? [candidate, source] : [source, candidate];
  return later.price! <= earlier.price!;
}

export function suggestMatches(source: Listing, candidates: Listing[]): MergeSuggestion[] {
  return candidates
    .filter((candidate) => isPossibleMatch(source, candidate))
    .filter((candidate) => (metresBetween(source, candidate) ?? 0) <= 150)
    .filter((candidate) => sameAddress(source, candidate) || priceDrop(source, candidate) <= 0.2)
    .filter((candidate) => sameAddress(source, candidate) || !source.bedroomCount || !candidate.bedroomCount || source.bedroomCount === candidate.bedroomCount)
    .map((candidate) => score(source, candidate))
    .filter((suggestion) => suggestion.score >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function score(source: Listing, candidate: Listing): MergeSuggestion {
  let points = 0;
  const reasons: string[] = [];
  const add = (value: number, reason?: string) => {
    points += value;
    if (reason) reasons.push(reason);
  };

  const surfaceGap = relativeGap(source.netHabitableSurface, candidate.netHabitableSurface);
  if (surfaceGap === 0) add(6, 'Même surface');
  else if (surfaceGap !== null && surfaceGap <= 0.05) add(3, 'Surface proche');
  else if (surfaceGap !== null && surfaceGap > 0.15) add(-4);

  const landGap = relativeGap(source.landSurface, candidate.landSurface);
  if (landGap === 0) add(5, 'Même terrain');
  else if (landGap !== null && landGap <= 0.05) add(2, 'Terrain proche');
  else if (landGap !== null && landGap > 0.25) add(-2);

  if (source.bedroomCount && source.bedroomCount === candidate.bedroomCount) add(1, 'Mêmes chambres');

  if (sameAddress(source, candidate)) add(20, 'Même adresse');
  else if (metresBetween(source, candidate) !== null) add(1, 'Adresse proche');

  if (source.subtype && candidate.subtype) add(source.subtype === candidate.subtype ? 1 : -2);
  if (source.peb && candidate.peb) add(source.peb === candidate.peb ? 1 : -3, source.peb === candidate.peb ? 'Même PEB' : undefined);
  if (source.agencyName && source.agencyName.trim().toLowerCase() === candidate.agencyName?.trim().toLowerCase()) add(3, 'Même agence');
  if (similarTitles(source.title, candidate.title)) add(2, 'Titre similaire');

  const [earlier, later] = candidate.firstSeenAt <= source.firstSeenAt ? [candidate, source] : [source, candidate];
  if (earlier.removedAt && Math.abs(Date.parse(later.firstSeenAt) - Date.parse(earlier.removedAt)) <= 45 * DAY) {
    add(1, 'Remise en ligne');
  }

  return { listing: candidate, score: points, reasons };
}

function metresBetween(a: Listing, b: Listing): number | null {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return null;
  const toRad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * toRad * Math.cos(((a.latitude + b.latitude) / 2) * toRad);
  const y = (b.latitude - a.latitude) * toRad;
  return 6371000 * Math.hypot(x, y);
}

function priceDrop(a: Listing, b: Listing): number {
  const [earlier, later] = a.firstSeenAt <= b.firstSeenAt ? [a, b] : [b, a];
  return earlier.price && later.price !== null ? 1 - later.price / earlier.price : 0;
}

function sameAddress(a: Listing, b: Listing): boolean {
  const distance = metresBetween(a, b);
  const numberA = houseNumber(a);
  const numberB = houseNumber(b);
  return distance !== null && distance <= 30 && (!numberA || !numberB || numberA === numberB);
}

function houseNumber(listing: Listing): string | null {
  const raw = listing.houseNumber ?? listing.street?.match(/\b(\d+\s*[a-z]?)\s*$/i)?.[1] ?? null;
  return raw ? raw.replace(/\s/g, '').toLowerCase() : null;
}

function relativeGap(a: number | null, b: number | null): number | null {
  if (!a || !b) return null;
  if (a === b) return 0;
  return Math.abs(a - b) / Math.max(a, b);
}

function similarTitles(a: string, b: string): boolean {
  const words = (title: string) =>
    new Set(title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w)));
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared >= 2 && shared / (wa.size + wb.size - shared) >= 0.4;
}
