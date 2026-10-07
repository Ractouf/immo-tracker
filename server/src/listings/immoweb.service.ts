import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ImmowebSearch } from './immoweb-search.model';

const SEARCH_URL = 'https://www.immoweb.be/en/search-results';

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
  bedroomCount: number | null;
  netHabitableSurface: number | null;
  landSurface: number | null;
  pictureUrl: string | null;
  flagMain: string | null;
  agencyName: string | null;
  peb: string | null;
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

    const all: FetchedListing[] = [];
    let page = 1;
    let totalItems = Infinity;

    while (all.length < totalItems) {
      const response = await axios.get(url, {
        params: { ...params, page },
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        timeout: 15000,
      });

      const data = response.data;
      totalItems = data.totalItems ?? 0;
      const results = data.results ?? [];
      if (results.length === 0) break;

      for (const raw of results) {
        all.push(this.mapListing(raw));
      }

      this.logger.log(`[${search.id}] Page ${page}: +${results.length} (${all.length}/${totalItems})`);
      page += 1;

      if (page > 50) break;
    }

    return all;
  }

  async checkSoldStatus(immowebId: number, attempt = 1): Promise<boolean | null> {
    try {
      const response = await axios.get(`https://www.immoweb.be/en/classified/house/for-sale/x/x/${immowebId}`, {
        headers: { 'User-Agent': USER_AGENT },
        validateStatus: () => true,
        timeout: 15000,
      });
      if (response.status !== 200 || typeof response.data !== 'string') return null;

      const classified = this.extractClassifiedJson(response.data);
      return classified?.flags?.isSoldOrRented ?? null;
    } catch (error) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        return this.checkSoldStatus(immowebId, attempt + 1);
      }
      this.logger.warn(`Impossible de vérifier le statut de l'annonce ${immowebId}: ${error}`);
      return null;
    }
  }

  private extractClassifiedJson(html: string): any | null {
    const marker = 'window.classified = ';
    const start = html.indexOf(marker);
    if (start === -1) return null;
    const jsonStart = start + marker.length;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = jsonStart; i < html.length; i++) {
      const char = html[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(jsonStart, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
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
      peb: raw?.transaction?.certificate ?? null,
      url: `https://www.immoweb.be/fr/annonce/${raw?.property?.type === 'APARTMENT' ? 'appartement' : 'maison'}/a-vendre/x/x/${raw.id}`,
    };
  }
}
