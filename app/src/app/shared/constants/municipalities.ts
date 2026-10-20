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

export const BRUSSELS_MUNICIPALITY_CENTERS: Record<string, [number, number]> = {
  '1000': [50.8467, 4.3525],
  '1020': [50.878, 4.353],
  '1030': [50.8676, 4.3737],
  '1040': [50.8333, 4.3896],
  '1050': [50.8275, 4.372],
  '1060': [50.827, 4.3456],
  '1070': [50.8333, 4.307],
  '1080': [50.855, 4.33],
  '1081': [50.8622, 4.3256],
  '1082': [50.864, 4.295],
  '1083': [50.871, 4.309],
  '1090': [50.8777, 4.3256],
  '1120': [50.893, 4.387],
  '1130': [50.889, 4.419],
  '1140': [50.871, 4.403],
  '1150': [50.829, 4.432],
  '1160': [50.8156, 4.433],
  '1170': [50.799, 4.415],
  '1180': [50.803, 4.337],
  '1190': [50.811, 4.32],
  '1200': [50.847, 4.429],
  '1210': [50.853, 4.373],
};

export function municipalityLabel(postalCode: string, fallbackLocality?: string | null): string {
  const name = BRUSSELS_MUNICIPALITIES[postalCode] ?? fallbackLocality;
  return name ? `${postalCode} ${name}` : postalCode;
}
