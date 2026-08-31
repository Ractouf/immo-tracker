import { DatePipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackSentiment, Listing, ListingStatus } from '../../shared/models/listing.model';

export interface FeedbackPatch {
  feedbackSentiment?: FeedbackSentiment;
  feedbackNote?: string | null;
  showcase?: boolean;
  ownerNote?: string | null;
}

export type ListingCardMode = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed';

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
  selector: 'app-listing-card',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass],
  templateUrl: './listing-card.html',
  styleUrl: './listing-card.scss',
})
export class ListingCard {
  private _listing!: Listing;

  @Input({ required: true })
  set listing(value: Listing) {
    this._listing = value;
    this.noteDraft = value.feedbackNote ?? '';
    this.ownerNoteDraft = value.ownerNote ?? '';
  }
  get listing(): Listing {
    return this._listing;
  }

  @Input({ required: true }) mode!: ListingCardMode;

  @Output() statusChange = new EventEmitter<{ listing: Listing; status: ListingStatus }>();
  @Output() mergeRequest = new EventEmitter<Listing>();
  @Output() feedbackChange = new EventEmitter<{ listing: Listing; patch: FeedbackPatch }>();

  noteDraft = '';
  ownerNoteDraft = '';

  formatPrice(value: number | null): string {
    if (value === null) return '—';
    return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  get flagLabel(): string | null {
    if (!this.listing.flagMain) return null;
    return FLAG_LABELS[this.listing.flagMain] ?? this.listing.flagMain;
  }

  get statusBorderClass(): string {
    return STATUS_BORDER_CLASSES[this.listing.status];
  }

  historyBorderClass(status: ListingStatus): string {
    return STATUS_BORDER_CLASSES[status];
  }

  historyStatusLabel(status: ListingStatus): string {
    return STATUS_LABELS[status];
  }

  setStatus(status: ListingStatus): void {
    this.statusChange.emit({ listing: this.listing, status });
  }

  openListing(): void {
    window.open(this.listing.url, '_blank', 'noopener');
  }

  setSentiment(sentiment: FeedbackSentiment): void {
    const next = this.listing.feedbackSentiment === sentiment ? null : sentiment;
    this.feedbackChange.emit({ listing: this.listing, patch: { feedbackSentiment: next } });
  }

  saveNote(): void {
    const note = this.noteDraft.trim() || null;
    if (note === this.listing.feedbackNote) return;
    this.feedbackChange.emit({ listing: this.listing, patch: { feedbackNote: note } });
  }

  toggleShowcase(): void {
    this.feedbackChange.emit({ listing: this.listing, patch: { showcase: !this.listing.showcase } });
  }

  saveOwnerNote(): void {
    const note = this.ownerNoteDraft.trim() || null;
    if (note === this.listing.ownerNote) return;
    this.feedbackChange.emit({ listing: this.listing, patch: { ownerNote: note } });
  }
}
