import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FeedbackSentiment, Listing, ListingStatus, SyncSummary } from '../models/listing.model';

const BASE_URL = '/api/listings';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  constructor(private readonly http: HttpClient) { }

  sync(): Promise<SyncSummary> {
    return firstValueFrom(this.http.post<SyncSummary>(`${BASE_URL}/sync`, {}));
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
      feedbackSentiment?: FeedbackSentiment;
      feedbackNote?: string | null;
      showcase?: boolean;
      ownerNote?: string | null;
    },
  ): Promise<Listing> {
    return firstValueFrom(this.http.patch<Listing>(`${BASE_URL}/${immowebId}`, patch));
  }

  merge(keepImmowebId: number, mergeImmowebId: number): Promise<Listing> {
    return firstValueFrom(this.http.post<Listing>(`${BASE_URL}/merge`, { keepImmowebId, mergeImmowebId }));
  }
}
