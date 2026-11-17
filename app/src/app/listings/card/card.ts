import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../shared/badge/badge';
import { ImmowebSearch } from '../../shared/models/immoweb-search.model';
import { Listing, ListingStatus, PriceHistoryEntry } from '../../shared/models/listing.model';
import { PebBadge } from '../../shared/peb-badge/peb-badge';
import { EmptyPipe } from '../../shared/pipes/empty.pipe';
import { Price } from '../../shared/price/price';
import { ImmowebSearchesService } from '../../shared/services/immoweb-searches.service';
import { propertyPriceHistory } from '../../shared/utils/price-history';

export interface ListingPatch {
  toVisit?: boolean;
  ownerNote?: string | null;
}

export type CardMode = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed' | 'detail';

const FLAG_LABELS: Record<string, string> = {
  under_option: 'Sous option',
  sold: 'Vendu',
  new: 'Nouveau',
};

const STATUS_BORDER_CLASSES: Record<ListingStatus, string> = {
  pending: 'border-gray-200',
  oui: 'border-emerald-500',
  peutetre: 'border-amber-500',
  non: 'border-gray-400',
};

const STATUS_LABELS: Record<ListingStatus, string> = {
  pending: 'À trier',
  oui: 'Oui',
  peutetre: 'Peut-être',
  non: 'Non',
};

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, NgClass, EmptyPipe, Price, PebBadge, Badge],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  @Input({ required: true })
  set listing(value: Listing) {
    this._listing = value;
    this.ownerNoteDraft = value.ownerNote ?? '';
    this.priceHistory = propertyPriceHistory(value);
    this.pricePerSqm = value.price !== null && value.netHabitableSurface ? Math.round(value.price / value.netHabitableSurface) : null;
    this.refreshSearches();
  }
  @Input({ required: true }) mode!: CardMode;

  @Output() statusChange = new EventEmitter<{ listing: Listing; status: ListingStatus }>();
  @Output() mergeRequest = new EventEmitter<Listing>();
  @Output() historyOpen = new EventEmitter<Listing>();
  @Output() listingChange = new EventEmitter<{ listing: Listing; patch: ListingPatch }>();

  ownerNoteDraft = '';
  searches: ImmowebSearch[] = [];
  priceHistory: PriceHistoryEntry[] = [];
  pricePerSqm: number | null = null;

  private _listing!: Listing;

  constructor(private readonly immowebSearchesService: ImmowebSearchesService, destroyRef: DestroyRef) {
    immowebSearchesService.changes.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.refreshSearches());
  }

  setStatus(status: ListingStatus): void {
    this.statusChange.emit({ listing: this.listing, status });
  }

  toggleToVisit(): void {
    this.listingChange.emit({ listing: this.listing, patch: { toVisit: !this.listing.toVisit } });
  }

  saveOwnerNote(): void {
    const note = this.ownerNoteDraft.trim() || null;
    if (note === this.listing.ownerNote) return;
    this.listingChange.emit({ listing: this.listing, patch: { ownerNote: note } });
  }

  historyBorderClass(status: ListingStatus): string {
    return STATUS_BORDER_CLASSES[status];
  }

  historyStatusLabel(status: ListingStatus): string {
    return STATUS_LABELS[status];
  }

  private refreshSearches(): void {
    const ids = this.listing.searchIds ?? [];
    this.searches = this.immowebSearchesService.searches.filter((s) => ids.includes(s.id));
  }

  get listing(): Listing {
    return this._listing;
  }

  get flagLabel(): string | null {
    if (!this.listing.flagMain) return null;
    return FLAG_LABELS[this.listing.flagMain] ?? this.listing.flagMain;
  }

  get statusLabel(): string {
    return STATUS_LABELS[this.listing.status];
  }

  get statusBorderClass(): string {
    return STATUS_BORDER_CLASSES[this.listing.status];
  }
}
