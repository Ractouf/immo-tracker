import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgencyStats, Listing, ListingStatus } from '../shared/models/listing.model';
import { ListingsService } from '../shared/services/listings.service';
import { ShareService } from '../shared/services/share.service';
import { FeedbackPatch, ListingCard, ListingCardMode } from './listing-card/listing-card';
import { Toggle } from '../shared/toggle/toggle';
import { AgencyStatsView } from '../agency-stats/agency-stats';
import { Filters } from '../shared/filters/filters';
import { Search } from '../shared/search/search';
import { SearchService } from '../shared/search/search.service';
import { TableCellType } from '../shared/table/table.enum';
import { TableAttribute } from '../shared/table/table.type';
import { municipalityLabel } from '../shared/constants/municipalities';

type Tab = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed' | 'agencies';

export type AgencyStatsRow = AgencyStats & { municipalityLabels: string[] };

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [ListingCard, FormsModule, Toggle, AgencyStatsView, Search, Filters],
  templateUrl: './listings.html',
  styleUrl: './listings.scss',
})
export class Listings implements OnInit, AfterViewInit {
  @ViewChild('searchComponent') searchComponent?: Search;
  @ViewChild('filtersComponent') filtersComponent?: Filters;

  activeTab: Tab = 'pending';
  syncing = false;
  loading = false;
  syncMessage: string | null = null;

  pending: Listing[] = [];
  oui: Listing[] = [];
  peutetre: Listing[] = [];
  non: Listing[] = [];
  removed: Listing[] = [];
  agencyStats: AgencyStatsRow[] = [];
  agencyStatsLoaded = false;

  hideUnderOption = false;

  filtersExpanded = false;

  sourceItems: any[] = [];
  filteredItems: any[] = [];

  readonly listingAttributes: TableAttribute[] = [
    { name: 'title', label: 'Titre', type: TableCellType.Text },
    { name: 'locality', label: 'Commune', type: TableCellType.Text, isFilter: false },
    { name: 'postalCode', label: 'Commune', type: TableCellType.Text, values: [], multi: true },
    { name: 'agencyName', label: 'Agence', type: TableCellType.Text, values: [], multi: true },
    { name: 'subtype', label: 'Sous-type', type: TableCellType.Text, values: [] },
    { name: 'flagMain', label: 'État', type: TableCellType.Text, values: [] },
    { name: 'price', label: 'Prix', type: TableCellType.Currency },
    { name: 'bedroomCount', label: 'Chambres', type: TableCellType.Number },
    { name: 'netHabitableSurface', label: 'Surface habitable', type: TableCellType.Number },
    { name: 'landSurface', label: 'Terrain', type: TableCellType.Number },
    { name: 'feedbackSentiment', label: 'Avis', type: TableCellType.Text, values: ['positif', 'negatif'] },
    { name: 'showcase', label: 'Coup de coeur', type: TableCellType.Boolean },
  ];

  readonly agencyAttributes: TableAttribute[] = [
    { name: 'agencyName', label: 'Agence', type: TableCellType.Text },
    { name: 'municipalityLabels', label: 'Communes', type: TableCellType.Text },
    { name: 'oui', label: 'Oui', type: TableCellType.Number },
    { name: 'peutetre', label: 'Peut-être', type: TableCellType.Number },
    { name: 'non', label: 'Non', type: TableCellType.Number },
    { name: 'avgPrice', label: 'Prix moyen', type: TableCellType.Currency },
    { name: 'total', label: 'Total', type: TableCellType.Number },
  ];

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

  shareModalOpen = false;
  shareToken: string | null = null;
  shareCopied = false;

  constructor(
    private readonly listingsService: ListingsService,
    private readonly shareService: ShareService,
    private readonly searchService: SearchService,
  ) { }

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    Promise.resolve().then(() => this.refreshSource());
  }

  private visibleListFor(tab: Tab): Listing[] {
    const list = this.listFor(tab);
    return this.hideUnderOption ? list.filter((l) => l.flagMain !== 'under_option') : list;
  }

  countFor(tab: Tab): number {
    if (tab === this.activeTab) return this.filteredItems.length;

    const list = this.visibleListFor(tab);
    const search = this.searchComponent;
    const filters = this.filtersComponent;
    if (!search || !filters) return list.length;

    const searched = this.searchService.search(list, search.searchBy, this.listingAttributes);
    return filters.applyFiltersTo(searched, filters.filters, this.listingAttributes).length;
  }

  get currentMode(): ListingCardMode {
    return this.activeTab === 'agencies' ? 'pending' : this.activeTab;
  }

  get currentAttributes(): TableAttribute[] {
    return this.activeTab === 'agencies' ? this.agencyAttributes : this.listingAttributes;
  }

  setTab(tab: Tab): void {
    const leavesAgencies = (this.activeTab === 'agencies') !== (tab === 'agencies');

    this.activeTab = tab;
    if (leavesAgencies) {
      this.clearSearchAndFilters();
    }

    if (tab === 'agencies' && !this.agencyStatsLoaded) {
      this.loadAgencyStats();
      return;
    }

    this.refreshSource();
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  onHideUnderOptionChange(value: boolean): void {
    this.hideUnderOption = value;
    this.refreshSource();
  }

  private refreshSource(): void {
    this.sourceItems = this.activeTab === 'agencies' ? this.agencyStats : this.visibleListFor(this.activeTab);

    const search = this.searchComponent;
    const filters = this.filtersComponent;
    if (!search || !filters) {
      this.filteredItems = this.sourceItems;
      return;
    }

    search.array = this.sourceItems;
    search.attributes = this.currentAttributes;
    filters.items = this.sourceItems;
    filters.attributes = this.currentAttributes;

    search.search(0);
  }

  private clearSearchAndFilters(): void {
    if (this.searchComponent) {
      this.searchComponent.searchBy = '';
    }
    if (this.filtersComponent) {
      this.filtersComponent.filters = {};
      this.filtersComponent.filtersArray = [];
    }
  }

  private listFor(tab: Tab): Listing[] {
    switch (tab) {
      case 'pending': return this.pending;
      case 'oui': return this.oui;
      case 'peutetre': return this.peutetre;
      case 'non': return this.non;
      case 'removed': return this.removed;
      case 'agencies': return [];
    }
  }

  private setListFor(tab: Tab, listings: Listing[]): void {
    switch (tab) {
      case 'pending': this.pending = listings; break;
      case 'oui': this.oui = listings; break;
      case 'peutetre': this.peutetre = listings; break;
      case 'non': this.non = listings; break;
      case 'removed': this.removed = listings; break;
      case 'agencies': break;
    }
  }

  async loadAgencyStats(): Promise<void> {
    const stats = await this.listingsService.agencyStats();
    this.agencyStats = stats.map((s) => ({
      ...s,
      municipalityLabels: s.municipalities.map((m) => `${m.locality} (${m.count})`),
    }));
    this.agencyStatsLoaded = true;
    if (this.activeTab === 'agencies') {
      this.refreshSource();
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
      this.refreshFilterValues();
    } finally {
      this.loading = false;
      this.refreshSource();
    }
  }

  private refreshFilterValues(): void {
    const all = [...this.pending, ...this.oui, ...this.peutetre, ...this.non, ...this.removed];

    for (const name of ['agencyName', 'subtype', 'flagMain'] as const) {
      const attribute = this.listingAttributes.find((a) => a.name === name);
      if (!attribute) continue;
      attribute.values = [...new Set(all.map((l) => l[name]).filter((v): v is string => !!v))].sort();
    }

    const postalCodeAttribute = this.listingAttributes.find((a) => a.name === 'postalCode');
    if (postalCodeAttribute) {
      const localityByPostalCode = new Map<string, string | null>();
      for (const l of all) {
        if (l.postalCode && !localityByPostalCode.has(l.postalCode)) localityByPostalCode.set(l.postalCode, l.locality);
      }
      postalCodeAttribute.values = [...localityByPostalCode.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([postalCode, locality]) => ({ id: postalCode, value: municipalityLabel(postalCode, locality) }));
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
    this.refreshSource();

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
      this.refreshSource();
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
        (l.postalCode ?? '').toLowerCase().includes(query) ||
        (l.agencyName ?? '').toLowerCase().includes(query)
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

  async openShareModal(): Promise<void> {
    this.shareModalOpen = true;
    this.shareCopied = false;
    const { token } = await this.shareService.getToken();
    this.shareToken = token;
  }

  closeShareModal(): void {
    this.shareModalOpen = false;
  }

  async regenerateShareToken(): Promise<void> {
    const { token } = await this.shareService.regenerateToken();
    this.shareToken = token;
    this.shareCopied = false;
  }

  async copyShareToken(): Promise<void> {
    if (!this.shareToken) return;
    await navigator.clipboard.writeText(this.shareToken);
    this.shareCopied = true;
  }
}
