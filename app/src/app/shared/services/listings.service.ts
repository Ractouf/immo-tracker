import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ImmowebSearch } from '../models/immoweb-search.model';
import { Listing, ListingStatus, SyncSummary } from '../models/listing.model';

const BASE_URL = '/api/listings';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  constructor(private readonly http: HttpClient) { }

  sync(searches: ImmowebSearch[]): Promise<SyncSummary> {
    return firstValueFrom(this.http.post<SyncSummary>(`${BASE_URL}/sync`, { searches }));
  }

  findByStatus(status: ListingStatus): Promise<Listing[]> {
    return firstValueFrom(this.http.get<Listing[]>(BASE_URL, { params: { status } }));
  }

  findRemoved(): Promise<Listing[]> {
    return firstValueFrom(this.http.get<Listing[]>(BASE_URL, { params: { removed: 'true' } }));
  }

  update(
    immowebId: number,
    patch: {
      status?: ListingStatus;
      toVisit?: boolean;
      ownerNote?: string | null;
    },
  ): Promise<Listing> {
    return firstValueFrom(this.http.patch<Listing>(`${BASE_URL}/${immowebId}`, patch));
  }

  unmerge(immowebId: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${BASE_URL}/unmerge`, { immowebId }));
  }

  merge(keepImmowebId: number, mergeImmowebId: number): Promise<Listing> {
    return firstValueFrom(this.http.post<Listing>(`${BASE_URL}/merge`, { keepImmowebId, mergeImmowebId }));
  }
}
