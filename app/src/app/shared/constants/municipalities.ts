export const BRUSSELS_MUNICIPALITIES: Record<string, string> = {
  '1000': 'Bruxelles',
  '1020': 'Laeken',
  '1030': 'Schaerbeek',
  '1040': 'Etterbeek',
  '1050': 'Ixelles',
  '1060': 'Saint-Gilles',
  '1070': 'Anderlecht',
  '1080': 'Molenbeek-Saint-Jean',
  '1081': 'Koekelberg',
  '1082': 'Berchem-Sainte-Agathe',
  '1083': 'Ganshoren',
  '1090': 'Jette',
  '1120': 'Neder-Over-Heembeek',
  '1130': 'Haren',
  '1140': 'Evere',
  '1150': 'Woluwe-Saint-Pierre',
  '1160': 'Auderghem',
  '1170': 'Watermael-Boitsfort',
  '1180': 'Uccle',
  '1190': 'Forest',
  '1200': 'Woluwe-Saint-Lambert',
  '1210': 'Saint-Josse-ten-Noode',
};

export function municipalityLabel(postalCode: string, fallbackLocality?: string | null): string {
  const name = BRUSSELS_MUNICIPALITIES[postalCode] ?? fallbackLocality;
  return name ? `${postalCode} ${name}` : postalCode;
}
