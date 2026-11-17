import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SaveState } from '../../shared/enums/save-state.enum';
import { Listing } from '../../shared/models/listing.model';
import { ListingsService } from '../../shared/services/listings.service';
import { ListingCard } from '../listing-card/listing-card';

@Component({
  selector: 'app-listing-detail-modal',
  imports: [ListingCard],
  templateUrl: './listing-detail-modal.html',
})
export class ListingDetailModal {
  @Input({ required: true }) listing!: Listing;
  @Input() canUnlink = true;
  @Output() close = new EventEmitter<void>();
  @Output() unlinked = new EventEmitter<void>();

  readonly SaveState = SaveState;
  unlinkState = SaveState.Neutral;
  error: string | null = null;

  constructor(private readonly listingsService: ListingsService) {}

  async unlink(): Promise<void> {
    if (!confirm('Dissocier cette annonce du bien ? Elle redeviendra une annonce indépendante.')) return;
    this.unlinkState = SaveState.Loading;
    this.error = null;
    try {
      await this.listingsService.unmerge(this.listing.immowebId);
      this.unlinked.emit();
    } catch (error) {
      this.error = 'Impossible de dissocier cette annonce.';
      this.unlinkState = SaveState.Error;
      setTimeout(() => (this.unlinkState = SaveState.Neutral), 2000);
    }
  }
}
