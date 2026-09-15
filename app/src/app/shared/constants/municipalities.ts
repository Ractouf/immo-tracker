/**
 * Canonical name for each postal code covered by the Immoweb search (see `SEARCH_PARAMS` in
 * server/src/listings/immoweb.service.ts). Agencies enter the commune name by hand in all sorts of
 * spellings (French/Dutch, with or without accents, "Brussels"/"Bruxelles"/"Brussel"...), but the
 * postal code itself is reliable — so it's what filtering and the merged "Commune" dropdown key off.
 */
export const BRUSSELS_MUNICIPALITIES: Record<string, string> = {
  '1000': 'Bruxelles',
  '1030': 'Schaerbeek',
  '1040': 'Etterbeek',
  '1050': 'Ixelles',
  '1060': 'Saint-Gilles',
  '1150': 'Woluwe-Saint-Pierre',
  '1160': 'Auderghem',
  '1170': 'Watermael-Boitsfort',
  '1200': 'Woluwe-Saint-Lambert',
};

/** "1040 Etterbeek", falling back to whatever locality text was seen if the code is unmapped. */
export function municipalityLabel(postalCode: string, fallbackLocality?: string | null): string {
  const name = BRUSSELS_MUNICIPALITIES[postalCode] ?? fallbackLocality;
  return name ? `${postalCode} ${name}` : postalCode;
}
