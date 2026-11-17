import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ImmowebSearches } from '../../immoweb-searches/immoweb-searches';
import { Badge } from '../../shared/badge/badge';
import { LISTING_CATEGORIES, LISTING_STATUSES, ListingCategory } from '../../shared/constants/listing-statuses';
import { SaveState } from '../../shared/enums/save-state.enum';
import { ImmowebSearch } from '../../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../../shared/services/immoweb-searches.service';
import { isPlainLeftClick } from '../../shared/utils/plain-click';

export type Tab = ListingCategory | 'agencies' | 'map';

@Component({
  selector: 'app-header',
  imports: [Badge, ImmowebSearches],
  templateUrl: './header.html',
})
export class Header {
  @Input({ required: true }) activeTab!: Tab;
  @Input({ required: true }) counts!: Record<Tab, number>;
  @Input({ required: true }) tabUrl!: (tab: Tab) => string;
  @Input() filtersExpanded = false;
  @Input() activeFilterCount = 0;
  @Input() syncState = SaveState.Neutral;
  @Output() tabChange = new EventEmitter<Tab>();
  @Output() toggleFilters = new EventEmitter<void>();
  @Output() sync = new EventEmitter<void>();
  @Output() newSearch = new EventEmitter<void>();
  @Output() manageSearches = new EventEmitter<void>();
  @Output() editSearch = new EventEmitter<ImmowebSearch>();

  readonly SaveState = SaveState;
  readonly tabs: { id: Tab; label: string; counted: boolean }[] = [
    ...LISTING_CATEGORIES.map((id) => ({ id, label: LISTING_STATUSES[id].label, counted: true })),
    { id: 'agencies', label: 'Agences', counted: false },
    { id: 'map', label: 'Carte', counted: false },
  ];

  constructor(readonly immowebSearchesService: ImmowebSearchesService) {}

  onTabClick(event: MouseEvent, tab: Tab): void {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    this.tabChange.emit(tab);
  }
}
