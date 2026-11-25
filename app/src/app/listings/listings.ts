import { Location } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgencyStatsView } from '../agency-stats/agency-stats';
import { computeAgencyStats } from '../agency-stats/agency-stats.util';
import { ImmowebSearchModal } from '../immoweb-searches/search-modal/search-modal';
import { LISTING_CATEGORIES, LISTING_STATUSES, ListingCategory, isListingCategory } from '../shared/constants/listing-statuses';
import { municipalityLabel } from '../shared/constants/municipalities';
import { SaveState } from '../shared/enums/save-state.enum';
import { Filters } from '../shared/filters/filters';
import { AgencyStats, Listing, ListingStatus } from '../shared/models/listing.model';
import { Paginator } from '../shared/paginator/paginator';
import { Search } from '../shared/search/search';
import { SearchService } from '../shared/search/search.service';
import { ImmowebSearchesService } from '../shared/services/immoweb-searches.service';
import { ListingsService } from '../shared/services/listings.service';
import { TableCellType } from '../shared/table/table.enum';
import { TableAttribute } from '../shared/table/table.type';
import { filtersToParams, paramsToFilters } from '../shared/utils/filter-params';
import { LISTING_SORT_FIELDS, ListingSortField, SortDirection, sortListings } from '../shared/utils/listing-sort';
import { isOtherProperty, suggestMatches } from '../shared/utils/merge-match';
import { readStorage, writeStorage } from '../shared/utils/storage';
import { isInZone } from '../shared/utils/zone';
import { Card, CardMode, ListingPatch } from './card/card';
import { DetailModal } from './detail-modal/detail-modal';
import { FilterBar } from './filter-bar/filter-bar';
import { Header, Tab } from './header/header';
import { MapView } from './map/map';
import { MergeModal } from './merge-modal/merge-modal';

const PAGE_SIZE_STORAGE_KEY = 'immo-tracker.page-size';
const SORT_STORAGE_KEY = 'immo-tracker.sort';
const FILTERS_EXPANDED_STORAGE_KEY = 'immo-tracker.filters-expanded';
const DEFAULT_SORT: { field: ListingSortField; direction: SortDirection } = { field: 'recent', direction: -1 };

const VIEW_SLUGS = {
  ...Object.fromEntries(LISTING_CATEGORIES.map((category) => [category, LISTING_STATUSES[category].slug])),
  agencies: 'agencies',
  map: 'map',
} as Record<Tab, string>;

export type AgencyStatsRow = AgencyStats & { municipalityLabels: string[] };

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [Card, AgencyStatsView, ImmowebSearchModal, Header, FilterBar, MapView, DetailModal, MergeModal, Paginator],
  templateUrl: './listings.html',
})
export class Listings implements OnInit, AfterViewInit {
  @ViewChild(FilterBar) filterBar?: FilterBar;

  readonly pageSizeOptions = [48, 102, 150];
  readonly tabCounts: Record<Tab, number> = { pending: 0, oui: 0, peutetre: 0, non: 0, removed: 0, agencies: 0, map: 0 };

  readonly listingAttributes: TableAttribute[] = [
    { name: 'title', label: 'Titre', type: TableCellType.Text, param: 'title' },
    { name: 'locality', label: 'Commune', type: TableCellType.Text, isFilter: false },
    { name: 'postalCode', label: 'Commune', type: TableCellType.Text, values: [], multi: true, param: 'municipality' },
    { name: 'agencyNames', label: 'Agence', type: TableCellType.Text, values: [], multi: true, param: 'agency', filterComparison: (agency: string, wanted: string) => agency === wanted },
    { name: 'subtype', label: 'Sous-type', type: TableCellType.Text, values: [], param: 'subtype' },
    { name: 'flagMain', label: 'État', type: TableCellType.Text, values: [], param: 'state' },
    { name: 'peb', label: 'PEB', type: TableCellType.Text, values: [], multi: true, param: 'peb', filterComparison: (peb: string | null, wanted: string) => peb === wanted },
    {
      name: 'flagMain', filterKey: 'underOption', label: 'Sous option', type: TableCellType.Boolean, param: 'under-option',
      filterComparison: (flag: string | null, underOption: boolean) => (flag === 'under_option') === underOption,
    },
    { name: 'isAuction', label: 'Vente publique', type: TableCellType.Boolean, param: 'auction', filterComparison: (isAuction: boolean | undefined, wanted: boolean) => !!isAuction === wanted },
    { name: 'price', label: 'Prix', type: TableCellType.Currency, param: 'price' },
    { name: 'bedroomCount', label: 'Chambres', type: TableCellType.Number, param: 'bedrooms' },
    { name: 'netHabitableSurface', label: 'Surface habitable', type: TableCellType.Number, param: 'surface' },
    { name: 'landSurface', label: 'Terrain', type: TableCellType.Number, param: 'land' },
    { name: 'toVisit', label: 'À visiter', type: TableCellType.Boolean, param: 'to-visit' },
    { name: 'latitude', filterKey: 'zone', label: 'Zone', type: TableCellType.Zone, param: 'zone', filterComparison: (_: unknown, zone: string, listing: Listing) => isInZone(listing.latitude, listing.longitude, zone) },
    {
      name: 'status', label: 'Réponse', type: TableCellType.Text, multi: true, isFilter: false, param: 'status', paramValues: VIEW_SLUGS,
      values: LISTING_CATEGORIES.map((id) => ({ id, value: LISTING_STATUSES[id].label })),
      filterComparison: (status: ListingStatus, wanted: string, listing: Listing) => (wanted === 'removed' ? !!listing.removedAt : !listing.removedAt && status === wanted),
    },
  ];

  readonly agencyAttributes: TableAttribute[] = [
    { name: 'agencyName', label: 'Agence', type: TableCellType.Text, param: 'agency' },
    { name: 'municipalityLabels', label: 'Communes', type: TableCellType.Text, param: 'municipality' },
    { name: 'oui', label: LISTING_STATUSES.oui.label, type: TableCellType.Number, param: LISTING_STATUSES.oui.slug },
    { name: 'peutetre', label: LISTING_STATUSES.peutetre.label, type: TableCellType.Number, param: LISTING_STATUSES.peutetre.slug },
    { name: 'non', label: LISTING_STATUSES.non.label, type: TableCellType.Number, param: LISTING_STATUSES.non.slug },
    { name: 'avgPrice', label: 'Prix moyen', type: TableCellType.Currency, param: 'avg-price' },
    { name: 'total', label: 'Total', type: TableCellType.Number, param: 'total' },
  ];

  readonly tabUrl = (tab: Tab): string => {
    const current = new URLSearchParams(this.location.path().split('?')[1] ?? '');
    const crossesAgencies = (this.activeTab === 'agencies') !== (tab === 'agencies');
    const params = crossesAgencies ? new URLSearchParams(current.has('sort') ? { sort: current.get('sort')! } : {}) : current;
    params.delete('page');
    if (tab !== 'map') params.delete('status');
    return this.joinUrl(`/${VIEW_SLUGS[tab]}`, params);
  };

  readonly pageUrl = (page: number): string => {
    const [path, query = ''] = this.location.path().split('?');
    const params = new URLSearchParams(query);
    if (page > 0) params.set('page', String(page + 1));
    else params.delete('page');
    return this.joinUrl(path, params);
  };

  activeTab: Tab = 'pending';
  syncState = SaveState.Neutral;
  loading = false;
  syncMessage: string | null = null;

  lists: Record<ListingCategory, Listing[]> = { pending: [], oui: [], peutetre: [], non: [], removed: [] };
  agencyStats: AgencyStatsRow[] = [];

  sourceItems: any[] = [];
  filteredItems: any[] = [];
  pagedItems: Listing[] = [];
  mapItems: Listing[] = [];

  page = 0;
  pageSize = this.loadPageSize();
  filtersExpanded = this.loadFiltersExpanded();
  sortField: ListingSortField;
  sortDirection: SortDirection;

  mergeSource: Listing | null = null;
  drawingZone = false;

  historyDetail: Listing | null = null;
  historyDetailCanUnlink = true;

  private readonly sortFields = LISTING_SORT_FIELDS;

  private pendingPageReset = false;
  private lastCriteria = '';
  private syncMessageTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly listingsService: ListingsService,
    private readonly searchService: SearchService,
    readonly immowebSearchesService: ImmowebSearchesService,
    private readonly destroyRef: DestroyRef,
    private readonly location: Location,
  ) {
    const storedSort = this.loadSort();
    this.sortField = storedSort.field;
    this.sortDirection = storedSort.direction;
  }

  ngOnInit(): void {
    this.immowebSearchesService.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pendingPageReset = true;
      this.refreshSource();
    });
    this.loadAll();
  }

  ngAfterViewInit(): void {
    const popState = this.location.subscribe(() => this.applyUrl());
    this.destroyRef.onDestroy(() => popState.unsubscribe());
    Promise.resolve().then(() => this.applyUrl());
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const loaded = await Promise.all(
        LISTING_CATEGORIES.map((category) => (category === 'removed' ? this.listingsService.findRemoved() : this.listingsService.findByStatus(category))),
      );
      this.lists = Object.fromEntries(LISTING_CATEGORIES.map((category, index) => [category, loaded[index]])) as Record<ListingCategory, Listing[]>;
      this.countSuggestions();
    } finally {
      this.loading = false;
      this.refreshSource();
    }
  }

  async sync(): Promise<void> {
    const searches = this.immowebSearchesService.active;
    if (searches.length === 0) {
      this.setSyncMessage('Active au moins une recherche Immoweb (bouton Recherches) avant de synchroniser.');
      return;
    }

    this.syncState = SaveState.Loading;
    this.setSyncMessage(null);
    try {
      const summary = await this.listingsService.sync(searches);
      this.setSyncMessage(
        `${summary.nouvelles} nouvelle(s), ${summary.misesAJour} mise(s) à jour, ${summary.disparues} disparue(s) - ${summary.total} annonces suivies au total.`,
      );
      await this.loadAll();
      this.syncState = SaveState.Ok;
    } catch (error) {
      this.setSyncMessage("Erreur pendant la synchronisation, vérifie que le serveur tourne.");
      this.syncState = SaveState.Error;
    } finally {
      setTimeout(() => (this.syncState = SaveState.Neutral), 2000);
    }
  }

  setTab(tab: Tab): void {
    this.location.go(this.tabUrl(tab));
    this.applyUrl();
  }

  async onStatusChange({ listing, status }: { listing: Listing; status: ListingStatus }): Promise<void> {
    this.lists[listing.status] = this.lists[listing.status].filter((l) => l.immowebId !== listing.immowebId);
    this.lists[status] = [{ ...listing, status }, ...this.lists[status]];
    this.refreshSource();

    try {
      await this.listingsService.update(listing.immowebId, { status });
    } catch (error) {
      await this.loadAll();
    }
  }

  async onListingChange({ listing, patch }: { listing: Listing; patch: ListingPatch }): Promise<void> {
    try {
      const updated = await this.listingsService.update(listing.immowebId, patch);
      for (const list of Object.values(this.lists)) {
        const idx = list.findIndex((l) => l.immowebId === listing.immowebId);
        if (idx !== -1) list[idx] = { ...list[idx], ...updated };
      }
      this.refreshSource();
    } catch (error) {
      await this.loadAll();
    }
  }

  onFiltered(items: any[]): void {
    this.filteredItems = items;
    this.refreshTabCounts();
    this.refreshPage();
    this.syncUrl();
  }

  setZone(zone: string | null): void {
    const filters = this.filtersComponent;
    if (!filters) return;
    const { zone: _, ...rest } = filters.filters;
    filters.filters = zone ? { ...rest, zone: { value: zone, label: 'Zone' } } : rest;
    this.refreshSource();
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
    writeStorage(FILTERS_EXPANDED_STORAGE_KEY, this.filtersExpanded);
  }

  setSortField(field: ListingSortField): void {
    this.sortField = field;
    this.sortDirection = this.sortFields.find((f) => f.id === field)?.defaultDirection ?? 1;
    this.applySort();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 1 ? -1 : 1;
    this.applySort();
  }

  setPage(page: number): void {
    this.page = page;
    this.refreshPage();
    this.syncUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.page = 0;
    this.refreshPage();
    this.syncUrl();
    writeStorage(PAGE_SIZE_STORAGE_KEY, size);
  }

  openMergePicker(listing: Listing): void {
    this.mergeSource = listing;
  }

  closeMergePicker(): void {
    this.mergeSource = null;
  }

  async onMerged(): Promise<void> {
    this.mergeSource = null;
    await this.loadAll();
  }

  openHistoryDetail(listing: Listing): void {
    this.historyDetail = listing;
    this.historyDetailCanUnlink = true;
  }

  openMergePreview(listing: Listing): void {
    this.historyDetail = listing;
    this.historyDetailCanUnlink = false;
  }

  closeHistoryDetail(): void {
    this.historyDetail = null;
  }

  async onUnlinked(): Promise<void> {
    this.historyDetail = null;
    await this.loadAll();
  }

  private applyUrl(): void {
    const [path, query = ''] = this.location.path().split('?');
    const tab = (Object.keys(VIEW_SLUGS) as Tab[]).find((t) => VIEW_SLUGS[t] === path.replace(/^\//, ''));
    if (!tab) {
      this.location.replaceState(`/${VIEW_SLUGS.pending}`, query);
      this.applyUrl();
      return;
    }

    const params = new URLSearchParams(query);
    this.activeTab = tab;
    this.drawingZone = false;
    this.listingAttributes.find((a) => a.name === 'status')!.isFilter = tab === 'map';
    if (this.searchComponent) this.searchComponent.searchBy = params.get('q') ?? '';
    if (this.filtersComponent) this.filtersComponent.filters = paramsToFilters(params, this.currentAttributes);
    const sort = this.parseSort(params.get('sort')) ?? this.loadSort();
    this.sortField = sort.field;
    this.sortDirection = sort.direction;
    this.page = Math.max(0, (Number(params.get('page')) || 1) - 1);
    this.pendingPageReset = false;
    this.lastCriteria = this.criteria;

    this.refreshSource();
  }

  private syncUrl(): void {
    const params = new URLSearchParams();
    const search = this.searchComponent?.searchBy.trim();
    if (search) params.set('q', search);
    if (this.filtersComponent) filtersToParams(this.filtersComponent.filters, this.currentAttributes, params);
    if (this.sortField !== DEFAULT_SORT.field || this.sortDirection !== DEFAULT_SORT.direction) {
      params.set('sort', `${this.sortSlug(this.sortField)}-${this.sortDirection === 1 ? 'asc' : 'desc'}`);
    }
    if (this.page > 0) params.set('page', String(this.page + 1));

    const path = `/${VIEW_SLUGS[this.activeTab]}`;
    if (!this.location.isCurrentPathEqualTo(path, params.toString())) {
      this.location.replaceState(path, params.toString());
    }
  }

  private joinUrl(path: string, params: URLSearchParams): string {
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }

  private refreshSource(): void {
    this.refreshFilterValues();
    if (this.activeTab === 'agencies') {
      this.agencyStats = computeAgencyStats(this.allVisibleListings()).map((s) => ({
        ...s,
        municipalityLabels: s.municipalities.map((m) => `${m.locality} (${m.count})`),
      }));
    }
    this.sourceItems = this.activeTab === 'agencies' ? this.agencyStats : this.visibleListFor(this.activeTab);

    const search = this.searchComponent;
    const filters = this.filtersComponent;
    if (!search || !filters) {
      this.filteredItems = this.sourceItems;
      this.refreshTabCounts();
      this.refreshPage();
      return;
    }

    search.array = this.sourceItems;
    search.attributes = this.currentAttributes;
    filters.items = this.sourceItems;
    filters.attributes = this.currentAttributes;

    search.search(0);
  }

  private refreshFilterValues(): void {
    const all = this.allVisibleListings();

    for (const name of ['agencyNames', 'subtype', 'flagMain', 'peb'] as const) {
      const attribute = this.listingAttributes.find((a) => a.name === name);
      if (!attribute) continue;
      attribute.values = [...new Set(all.flatMap((l) => l[name] ?? []).filter((v): v is string => !!v))].sort();
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

  private refreshTabCounts(): void {
    const search = this.searchComponent;
    const filters = this.filtersComponent;
    for (const tab of LISTING_CATEGORIES) {
      const list = this.visibleListFor(tab);
      if (!search || !filters || this.activeTab === 'agencies') {
        this.tabCounts[tab] = list.length;
        continue;
      }
      const searched = this.searchService.search(list, search.searchBy, this.listingAttributes);
      this.tabCounts[tab] = filters.applyFiltersTo(searched, filters.filters, this.listingAttributes).length;
    }
    if (isListingCategory(this.activeTab)) {
      this.tabCounts[this.activeTab] = this.filteredItems.length;
    }
  }

  private refreshPage(): void {
    const criteria = this.criteria;
    if (this.pendingPageReset || criteria !== this.lastCriteria) {
      this.page = 0;
      this.pendingPageReset = false;
      this.lastCriteria = criteria;
    }

    if (!this.loading) {
      const lastPage = Math.max(0, Math.ceil(this.filteredItems.length / this.pageSize) - 1);
      this.page = Math.min(this.page, lastPage);
    }
    const sorted = this.activeTab === 'agencies' ? this.filteredItems : sortListings(this.filteredItems, this.sortField, this.sortDirection);
    this.pagedItems = sorted.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
    const showRemoved = [this.filtersComponent?.filters['status']?.value ?? []].flat().includes('removed');
    this.mapItems = showRemoved ? this.filteredItems : this.filteredItems.filter((l) => !l.removedAt);
  }

  private countSuggestions(): void {
    const all = Object.values(this.lists).flat();
    for (const listing of all) {
      listing.agencyNames = [...new Set([listing, ...(listing.groupHistory ?? [])].map((l) => l.agencyName).filter((name): name is string => !!name))];
      const suggestions = suggestMatches(listing, all.filter((l) => isOtherProperty(listing, l)));
      listing.suggestionCount = suggestions.length;
      listing.bestSuggestionScore = suggestions[0]?.score;
    }
  }

  private setSyncMessage(message: string | null): void {
    clearTimeout(this.syncMessageTimeout);
    this.syncMessage = message;
    if (message) {
      this.syncMessageTimeout = setTimeout(() => (this.syncMessage = null), 5000);
    }
  }

  private applySort(): void {
    this.pendingPageReset = true;
    this.refreshPage();
    this.syncUrl();
    writeStorage(SORT_STORAGE_KEY, { field: this.sortField, direction: this.sortDirection });
  }

  private allVisibleListings(): Listing[] {
    return LISTING_CATEGORIES.flatMap((tab) => this.visibleListFor(tab));
  }

  private visibleListFor(tab: Tab): Listing[] {
    const activeSearchIds = new Set(this.immowebSearchesService.active.map((s) => s.id));
    const list = isListingCategory(tab) ? this.lists[tab] : tab === 'map' ? Object.values(this.lists).flat() : [];
    return list.filter((l) => !l.searchIds?.length || l.searchIds.some((id) => activeSearchIds.has(id)));
  }

  private parseSort(value: string | null): { field: ListingSortField; direction: SortDirection } | null {
    const match = value?.match(/^(.+)-(asc|desc)$/);
    const field = match && this.sortFields.find((f) => this.sortSlug(f.id) === match[1]);
    return field ? { field: field.id, direction: match[2] === 'asc' ? 1 : -1 } : null;
  }

  private sortSlug(field: ListingSortField): string {
    return field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  private loadSort(): { field: ListingSortField; direction: SortDirection } {
    const stored = readStorage<{ field: ListingSortField; direction: SortDirection }>(SORT_STORAGE_KEY);
    return stored && this.sortFields.some((f) => f.id === stored.field) && (stored.direction === 1 || stored.direction === -1) ? stored : DEFAULT_SORT;
  }

  private loadPageSize(): number {
    const stored = readStorage<number>(PAGE_SIZE_STORAGE_KEY);
    return stored !== null && this.pageSizeOptions.includes(stored) ? stored : this.pageSizeOptions[0];
  }

  private loadFiltersExpanded(): boolean {
    return readStorage<boolean>(FILTERS_EXPANDED_STORAGE_KEY) !== false;
  }

  get activeFilterCount(): number {
    return (this.filtersComponent?.filtersArray.length ?? 0) + (this.searchComponent?.searchBy.trim() ? 1 : 0);
  }

  get emptyMessage(): string | null {
    if (this.loading) return 'Chargement…';
    if (this.filteredItems.length > 0) return null;
    if (this.sourceItems.length > 0) return this.activeTab === 'agencies' ? 'Aucune agence ne correspond à cette recherche.' : 'Aucune annonce ne correspond à cette recherche.';
    return this.activeTab === 'pending' ? 'Tout est trié.' : "Rien ici pour l'instant.";
  }

  get zone(): string | null {
    return this.filtersComponent?.filters['zone']?.value ?? null;
  }

  get isFullHeight(): boolean {
    return this.activeTab === 'map' || this.activeTab === 'agencies';
  }

  get isListView(): boolean {
    return isListingCategory(this.activeTab);
  }

  get currentMode(): CardMode {
    return isListingCategory(this.activeTab) ? this.activeTab : 'pending';
  }

  get currentAttributes(): TableAttribute[] {
    return this.activeTab === 'agencies' ? this.agencyAttributes : this.listingAttributes;
  }

  private get criteria(): string {
    return JSON.stringify([this.searchComponent?.searchBy ?? '', this.filtersComponent?.filters ?? {}]);
  }

  private get searchComponent(): Search | undefined {
    return this.filterBar?.searchComponent;
  }

  private get filtersComponent(): Filters | undefined {
    return this.filterBar?.filtersComponent;
  }
}
