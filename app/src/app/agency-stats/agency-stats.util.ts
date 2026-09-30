import { AgencyStats, Listing } from '../shared/models/listing.model';

export function computeAgencyStats(listings: Listing[]): AgencyStats[] {
  const byAgency = new Map<string, Listing[]>();
  for (const listing of listings) {
    const agencyName = listing.agencyName?.trim() || 'Agence inconnue';
    const bucket = byAgency.get(agencyName);
    if (bucket) bucket.push(listing);
    else byAgency.set(agencyName, [listing]);
  }

  const stats: AgencyStats[] = [];
  for (const [agencyName, agencyListings] of byAgency) {
    const municipalityCounts = new Map<string, number>();
    let priceSum = 0;
    let priceCount = 0;
    let pending = 0;
    let oui = 0;
    let peutetre = 0;
    let non = 0;
    let soldCount = 0;
    let removedCount = 0;

    for (const listing of agencyListings) {
      if (listing.status !== 'non') {
        const locality = listing.locality?.trim() || 'Inconnue';
        municipalityCounts.set(locality, (municipalityCounts.get(locality) ?? 0) + 1);
      }

      if (listing.price !== null) {
        priceSum += listing.price;
        priceCount += 1;
      }

      switch (listing.status) {
        case 'pending': pending += 1; break;
        case 'oui': oui += 1; break;
        case 'peutetre': peutetre += 1; break;
        case 'non': non += 1; break;
      }

      if (listing.flagMain === 'sold') soldCount += 1;
      if (listing.removedAt) removedCount += 1;
    }

    stats.push({
      agencyName,
      total: agencyListings.length,
      active: agencyListings.length - removedCount,
      pending,
      oui,
      peutetre,
      non,
      soldCount,
      removedCount,
      avgPrice: priceCount > 0 ? Math.round(priceSum / priceCount) : null,
      municipalities: Array.from(municipalityCounts.entries())
        .map(([locality, count]) => ({ locality, count }))
        .sort((a, b) => b.count - a.count || a.locality.localeCompare(b.locality)),
    });
  }

  return stats.sort((a, b) => b.oui - a.oui || b.peutetre - a.peutetre || b.non - a.non);
}
