import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../shared/badge/badge';
import { Listing } from '../../shared/models/listing.model';
import { ListingsService } from '../../shared/services/listings.service';
import { MergeSuggestion, isOtherProperty, isPossibleMatch, suggestMatches } from '../../shared/utils/merge-match';

type MergeCategory = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed';

export type MergeLists = Record<MergeCategory, Listing[]>;

@Component({
  selector: 'app-merge-modal',
  imports: [FormsModule, DatePipe, NgTemplateOutlet, Badge],
  templateUrl: './merge-modal.html',
})
export class MergeModal {
  @Input({ required: true }) source!: Listing;
  @Input({ required: true }) lists!: MergeLists;
  @Output() close = new EventEmitter<void>();
  @Output() merged = new EventEmitter<void>();
  @Output() preview = new EventEmitter<Listing>();

  readonly categories: { value: MergeCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'À trier' },
    { value: 'oui', label: 'Oui' },
    { value: 'peutetre', label: 'Peut-être' },
    { value: 'non', label: 'Non' },
    { value: 'removed', label: 'Disparues' },
  ];

  query = '';
  category: MergeCategory | 'all' = 'all';
  suggestions: MergeSuggestion[] = [];
  merging = false;
  error: string | null = null;

  constructor(private readonly listingsService: ListingsService) {}

  ngOnInit(): void {
    this.suggestions = suggestMatches(this.source, this.allListings.filter((l) => isOtherProperty(this.source, l)));
  }

  async merge(candidate: Listing): Promise<void> {
    this.merging = true;
    this.error = null;
    try {
      await this.listingsService.merge(this.source.immowebId, candidate.immowebId);
      this.merged.emit();
    } catch (error) {
      this.error = 'Impossible de fusionner ces annonces.';
    } finally {
      this.merging = false;
    }
  }

  formatPrice(value: number | null): string {
    if (value === null) return '-';
    return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  get candidates(): Listing[] {
    const seen = new Set<number>();
    const query = this.query.trim().toLowerCase();
    const suggested = new Set(this.suggestions.map((s) => s.listing.immowebId));
    const pool = this.category === 'all' ? this.allListings : this.lists[this.category];
    return pool.filter((l) => {
      if (!isOtherProperty(this.source, l) || suggested.has(l.immowebId)) return false;
      if (!isPossibleMatch(this.source, l)) return false;
      if (seen.has(l.immowebId)) return false;
      seen.add(l.immowebId);
      if (!query) return true;
      return (
        l.title.toLowerCase().includes(query) ||
        (l.locality ?? '').toLowerCase().includes(query) ||
        (l.postalCode ?? '').toLowerCase().includes(query) ||
        (l.agencyName ?? '').toLowerCase().includes(query)
      );
    });
  }

  private get allListings(): Listing[] {
    return Object.values(this.lists).flat();
  }
}
