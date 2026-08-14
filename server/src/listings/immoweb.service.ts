import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const SEARCH_URL = 'https://www.immoweb.be/en/search-results/house/for-sale';
const SEARCH_PARAMS = {
  countries: 'BE',
  priceType: 'PRICE',
  postalCodes: 'BE-1000,BE-1030,BE-1040,BE-1050,BE-1060,BE-1150,BE-1160,BE-1170,BE-1200',
  maxPrice: '600000',
  orderBy: 'newest',
};

export interface FetchedListing {
  immowebId: number;
  title: string;
  price: number | null;
  propertyType: string | null;
  subtype: string | null;
  locality: string | null;
  postalCode: string | null;
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  agencyName: string | null;
  url: string;
}

@Injectable()
export class ImmowebService {
  private readonly logger = new Logger(ImmowebService.name);

  async fetchAllListings(): Promise<FetchedListing[]> {
    const all: FetchedListing[] = [];
    let page = 1;
    let totalItems = Infinity;

    while (all.length < totalItems) {
      const response = await axios.get(SEARCH_URL, {
        params: { ...SEARCH_PARAMS, page },
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
      });

      const data = response.data;
      totalItems = data.totalItems ?? 0;
      const results = data.results ?? [];
      if (results.length === 0) break;

      for (const raw of results) {
        all.push(this.mapListing(raw));
      }

      this.logger.log(`Page ${page}: +${results.length} (${all.length}/${totalItems})`);
      page += 1;

      if (page > 50) break; // garde-fou
    }

    return all;
  }

  private mapListing(raw: any): FetchedListing {
    const price = raw?.transaction?.sale?.price ?? raw?.price?.mainValue ?? null;

    return {
      immowebId: raw.id,
      title: raw?.property?.title ?? 'Sans titre',
      price,
      propertyType: raw?.property?.type ?? null,
      subtype: raw?.property?.subtype ?? null,
      locality: raw?.property?.location?.locality ?? null,
      postalCode: raw?.property?.location?.postalCode ?? null,
      bedroomCount: raw?.property?.bedroomCount ?? null,
      netHabitableSurface: raw?.property?.netHabitableSurface ?? null,
      landSurface: raw?.property?.landSurface ?? null,
      pictureUrl: raw?.media?.pictures?.[0]?.mediumUrl ?? null,
      flagMain: raw?.flags?.main ?? null,
      agencyName: raw?.customerName ?? null,
      url: `https://www.immoweb.be/fr/annonce/maison/a-vendre/x/x/${raw.id}`,
    };
  }
}
