import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { mapWithConcurrency } from '../utils/concurrency';
import { ImmowebSearch } from './immoweb-search.model';

const SEARCH_URL = 'https://www.immoweb.be/en/search-results';
const MAX_PAGES = 50;
const PAGE_CONCURRENCY = 3;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface FetchedListing {
  immowebId: number;
  title: string;
  price: number | null;
  propertyType: string | null;
  subtype: string | null;
  locality: string | null;
  postalCode: string | null;
  street: string | null;
  houseNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  agencyName: string | null;
  peb: string | null;
  isAuction: boolean;
  url: string;
}

@Injectable()
export class ImmowebService {
  private readonly logger = new Logger(ImmowebService.name);

  async fetchAllListings(search: ImmowebSearch): Promise<FetchedListing[]> {
    const url = `${SEARCH_URL}/${search.propertyType}/for-sale`;
    const params: Record<string, string> = {
      countries: 'BE',
      priceType: 'PRICE',
      postalCodes: search.postalCodes.map((code) => `BE-${code}`).join(','),
      orderBy: 'newest',
    };
    if (search.minPrice !== null) params.minPrice = String(search.minPrice);
    if (search.maxPrice !== null) params.maxPrice = String(search.maxPrice);
    if (search.minBedroomCount !== null) params.minBedroomCount = String(search.minBedroomCount);

    const first = await this.fetchPage(url, params, 1);
    if (first.results.length === 0) return [];

    const pageCount = Math.min(MAX_PAGES, Math.ceil(first.totalItems / first.results.length));
    const otherPages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
    const rest = await mapWithConcurrency(otherPages, PAGE_CONCURRENCY, (page) => this.fetchPage(url, params, page));
    const listings = [first, ...rest].flatMap((page) => page.results.map((raw) => this.mapListing(raw)));

    this.logger.log(`[${search.id}] ${pageCount} page(s): ${listings.length}/${first.totalItems}`);
    return listings;
  }

  private async fetchPage(url: string, params: Record<string, string>, page: number): Promise<{ totalItems: number; results: any[] }> {
    const response = await axios.get(url, {
      params: { ...params, page },
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      timeout: 15000,
    });
    return { totalItems: response.data.totalItems ?? 0, results: response.data.results ?? [] };
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
      street: raw?.property?.location?.street ?? null,
      houseNumber: raw?.property?.location?.number ?? null,
      latitude: raw?.property?.location?.latitude ?? null,
      longitude: raw?.property?.location?.longitude ?? null,
      bedroomCount: raw?.property?.bedroomCount ?? null,
      netHabitableSurface: raw?.property?.netHabitableSurface ?? null,
      landSurface: raw?.property?.landSurface ?? null,
      pictureUrl: raw?.media?.pictures?.[0]?.mediumUrl ?? null,
      flagMain: raw?.flags?.main ?? null,
      agencyName: raw?.customerName ?? null,
      peb: raw?.transaction?.certificate ?? null,
      isAuction: !!raw?.transaction?.sale?.publicSale,
      url: `https://www.immoweb.be/fr/annonce/${raw?.property?.type === 'APARTMENT' ? 'appartement' : 'maison'}/a-vendre/x/x/${raw.id}`,
    };
  }
}
