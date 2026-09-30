import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ImmowebSearch } from '../models/immoweb-search.model';

const STORAGE_KEY = 'immo-tracker.immoweb-searches';

@Injectable({ providedIn: 'root' })
export class ImmowebSearchesService {
  searches: ImmowebSearch[] = this.load();
  readonly changes = new Subject<void>();

  get active(): ImmowebSearch[] {
    return this.searches.filter((s) => s.active);
  }

  get inactive(): ImmowebSearch[] {
    return this.searches.filter((s) => !s.active);
  }

  save(search: ImmowebSearch): void {
    const index = this.searches.findIndex((s) => s.id === search.id);
    this.searches = index === -1 ? [...this.searches, search] : this.searches.map((s, i) => (i === index ? search : s));
    this.persist();
  }

  remove(id: string): void {
    this.searches = this.searches.filter((s) => s.id !== id);
    this.persist();
  }

  setActive(id: string, active: boolean): void {
    this.searches = this.searches.map((s) => (s.id === id ? { ...s, active } : s));
    this.persist();
  }

  private load(): ImmowebSearch[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ImmowebSearch[]) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    this.changes.next();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.searches));
    } catch {
    }
  }
}
