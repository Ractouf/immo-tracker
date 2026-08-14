import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Listing, ListingStatus } from '../shared/models/listing.model';
import { ListingsService } from '../shared/services/listings.service';
import { FeedbackPatch, ListingCard, ListingCardMode } from './listing-card/listing-card';
import { Toggle } from '../shared/toggle/toggle';

type Tab = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [ListingCard, FormsModule, Toggle],
  templateUrl: './listings.html',
  styleUrl: './listings.scss',
})
export class Listings implements OnInit {
  activeTab: Tab = 'pending';
  syncing = false;
  loading = false;
  syncMessage: string | null = null;

  pending: Listing[] = [];
  oui: Listing[] = [];
  peutetre: Listing[] = [];
  non: Listing[] = [];
  removed: Listing[] = [];

  hideUnderOption = false;

  mergeSource: Listing | null = null;
  mergeQuery = '';
  mergeCategoryFilter: Tab | 'all' = 'all';
  merging = false;
  mergeError: string | null = null;

  readonly mergeCategories: { value: Tab | 'all'; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'À trier' },
    { value: 'oui', label: 'Oui' },
    { value: 'peutetre', label: 'Peut-être' },
    { value: 'non', label: 'Non' },
    { value: 'removed', label: 'Disparues' },
  ];

  constructor(private readonly listingsService: ListingsService) { }

  ngOnInit(): void {
    this.loadAll();
  }

  get currentList(): Listing[] {
    return this.visibleListFor(this.activeTab);
  }

  private visibleListFor(tab: Tab): Listing[] {
    const list = this.listFor(tab);
    return this.hideUnderOption ? list.filter((l) => l.flagMain !== 'under_option') : list;
  }

  countFor(tab: Tab): number {
    return this.visibleListFor(tab).length;
  }

  get currentMode(): ListingCardMode {
    return this.activeTab;
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }

  private listFor(tab: Tab): Listing[] {
    switch (tab) {
      case 'pending': return this.pending;
      case 'oui': return this.oui;
      case 'peutetre': return this.peutetre;
      case 'non': return this.non;
      case 'removed': return this.removed;
    }
  }

  private setListFor(tab: Tab, listings: Listing[]): void {
    switch (tab) {
      case 'pending': this.pending = listings; break;
      case 'oui': this.oui = listings; break;
      case 'peutetre': this.peutetre = listings; break;
      case 'non': this.non = listings; break;
      case 'removed': this.removed = listings; break;
    }
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const [pending, oui, peutetre, non, removed] = await Promise.all([
        this.listingsService.findByStatus('pending'),
        this.listingsService.findByStatus('oui'),
        this.listingsService.findByStatus('peutetre'),
        this.listingsService.findByStatus('non'),
        this.listingsService.findRemoved(),
      ]);
      this.pending = pending;
      this.oui = oui;
      this.peutetre = peutetre;
      this.non = non;
      this.removed = removed;
    } finally {
      this.loading = false;
    }
  }

  private syncMessageTimeout?: ReturnType<typeof setTimeout>;

  async sync(): Promise<void> {
    this.syncing = true;
    this.setSyncMessage(null);
    try {
      const summary = await this.listingsService.sync();
      this.setSyncMessage(
        `${summary.nouvelles} nouvelle(s), ${summary.misesAJour} mise(s) à jour, ${summary.disparues} disparue(s) - ${summary.total} annonces suivies au total.`,
      );
      await this.loadAll();
    } catch (error) {
      this.setSyncMessage("Erreur pendant la synchronisation, vérifie que le serveur tourne.");
    } finally {
      this.syncing = false;
    }
  }

  private setSyncMessage(message: string | null): void {
    clearTimeout(this.syncMessageTimeout);
    this.syncMessage = message;
    if (message) {
      this.syncMessageTimeout = setTimeout(() => (this.syncMessage = null), 5000);
    }
  }

  async onStatusChange({ listing, status }: { listing: Listing; status: ListingStatus }): Promise<void> {
    const previousTab = this.activeTab;
    this.setListFor(previousTab, this.listFor(previousTab).filter((l) => l.immowebId !== listing.immowebId));

    const updated = { ...listing, status };
    this.setListFor(status, [updated, ...this.listFor(status)]);

    try {
      await this.listingsService.update(listing.immowebId, { status });
    } catch (error) {
      await this.loadAll();
    }
  }

  async onFeedbackChange({ listing, patch }: { listing: Listing; patch: FeedbackPatch }): Promise<void> {
    try {
      const updated = await this.listingsService.update(listing.immowebId, patch);
      for (const tab of ['pending', 'oui', 'peutetre', 'non', 'removed'] as const) {
        const list = this.listFor(tab);
        const idx = list.findIndex((l) => l.immowebId === listing.immowebId);
        if (idx !== -1) list[idx] = updated;
      }
    } catch (error) {
      await this.loadAll();
    }
  }

  formatMergePrice(value: number | null): string {
    if (value === null) return '—';
    return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  private get mergeCategorySource(): Listing[] {
    switch (this.mergeCategoryFilter) {
      case 'pending': return this.pending;
      case 'oui': return this.oui;
      case 'peutetre': return this.peutetre;
      case 'non': return this.non;
      case 'removed': return this.removed;
      case 'all':
      default:
        return [...this.pending, ...this.oui, ...this.peutetre, ...this.non, ...this.removed];
    }
  }

  get mergeCandidates(): Listing[] {
    if (!this.mergeSource) return [];
    const seen = new Set<number>();
    const query = this.mergeQuery.trim().toLowerCase();

    return this.mergeCategorySource.filter((l) => {
      if (l.immowebId === this.mergeSource!.immowebId) return false;
      if (seen.has(l.immowebId)) return false;
      seen.add(l.immowebId);
      if (!query) return true;
      return (
        l.title.toLowerCase().includes(query) ||
        (l.locality ?? '').toLowerCase().includes(query) ||
        (l.postalCode ?? '').toLowerCase().includes(query)
      );
    });
  }

  setMergeCategoryFilter(category: Tab | 'all'): void {
    this.mergeCategoryFilter = category;
  }

  openMergePicker(listing: Listing): void {
    this.mergeSource = listing;
    this.mergeQuery = '';
    this.mergeCategoryFilter = 'all';
    this.mergeError = null;
  }

  closeMergePicker(): void {
    this.mergeSource = null;
  }

  async confirmMerge(candidate: Listing): Promise<void> {
    if (!this.mergeSource) return;
    this.merging = true;
    this.mergeError = null;
    try {
      await this.listingsService.merge(this.mergeSource.immowebId, candidate.immowebId);
      this.mergeSource = null;
      await this.loadAll();
    } catch (error) {
      this.mergeError = 'Impossible de fusionner ces annonces.';
    } finally {
      this.merging = false;
    }
  }
}
