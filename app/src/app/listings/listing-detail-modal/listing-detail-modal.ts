import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Listing, ListingStatus } from '../../shared/models/listing.model';
import { Price } from '../../shared/price/price';
import { PebBadge } from '../../shared/peb-badge/peb-badge';

const STATUS_LABELS: Record<ListingStatus, string> = {
  pending: 'À trier',
  oui: 'Oui',
  peutetre: 'Peut-être',
  non: 'Non',
};

const FLAG_LABELS: Record<string, string> = {
  under_option: 'Sous option',
  sold: 'Vendu',
  new: 'Nouveau',
};

@Component({
  selector: 'app-listing-detail-modal',
  imports: [DatePipe, Price, PebBadge],
  templateUrl: './listing-detail-modal.html',
})
export class ListingDetailModal {
  @Input({ required: true }) listing!: Listing;
  @Input() unlinking = false;
  @Input() error: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() unlink = new EventEmitter<Listing>();

  get statusLabel(): string {
    return STATUS_LABELS[this.listing.status];
  }

  get flagLabel(): string | null {
    if (!this.listing.flagMain) return null;
    return FLAG_LABELS[this.listing.flagMain] ?? this.listing.flagMain;
  }

  confirmUnlink(): void {
    if (!confirm('Dissocier cette annonce du bien ? Elle redeviendra une annonce indépendante.')) return;
    this.unlink.emit(this.listing);
  }
}
