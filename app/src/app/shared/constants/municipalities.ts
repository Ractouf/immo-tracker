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

export function municipalityLabel(postalCode: string, fallbackLocality?: string | null): string {
  const name = BRUSSELS_MUNICIPALITIES[postalCode] ?? fallbackLocality;
  return name ? `${postalCode} ${name}` : postalCode;
}
