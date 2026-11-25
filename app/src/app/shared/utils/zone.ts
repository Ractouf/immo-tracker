export type LatLng = [number, number];

export function encodeZone(points: LatLng[]): string {
  let previous: LatLng = [0, 0];
  let encoded = '';
  for (const point of points) {
    const rounded = point.map((value) => Math.round(value * 1e5)) as LatLng;
    for (const index of [0, 1]) {
      let value = rounded[index] - previous[index];
      value = value < 0 ? ~(value << 1) : value << 1;
      while (value >= 0x20) {
        encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
      }
      encoded += String.fromCharCode(value + 63);
    }
    previous = rounded;
  }
  return encoded;
}

export function decodeZone(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  const current = [0, 0];
  let position = 0;
  while (position < encoded.length) {
    for (const index of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(position++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && position < encoded.length);
      current[index] += result & 1 ? ~(result >> 1) : result >> 1;
    }
    points.push([current[0] / 1e5, current[1] / 1e5]);
  }
  return points;
}

let cached: { encoded: string; polygon: LatLng[] } | null = null;

export function isInZone(lat: number | null, lng: number | null, encoded: string): boolean {
  if (lat === null || lng === null) return false;
  if (cached?.encoded !== encoded) cached = { encoded, polygon: decodeZone(encoded) };
  const polygon = cached.polygon;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    if (latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
}
