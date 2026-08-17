import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const BASE_URL = '/api/share-token';

@Injectable({ providedIn: 'root' })
export class ShareService {
  constructor(private readonly http: HttpClient) { }

  getToken(): Promise<{ token: string }> {
    return firstValueFrom(this.http.get<{ token: string }>(BASE_URL));
  }

  regenerateToken(): Promise<{ token: string }> {
    return firstValueFrom(this.http.post<{ token: string }>(`${BASE_URL}/regenerate`, {}));
  }
}
