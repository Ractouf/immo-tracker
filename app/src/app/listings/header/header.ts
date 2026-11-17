import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ImmowebSearches } from '../../immoweb-searches/immoweb-searches';
import { Badge } from '../../shared/badge/badge';
import { SaveState } from '../../shared/enums/save-state.enum';
import { ImmowebSearch } from '../../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../../shared/services/immoweb-searches.service';
import { isPlainLeftClick } from '../../shared/utils/plain-click';

export type Tab = 'pending' | 'oui' | 'peutetre' | 'non' | 'removed' | 'agencies' | 'map';

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
    { id: 'pending', label: 'À trier', counted: true },
    { id: 'oui', label: 'Oui', counted: true },
    { id: 'peutetre', label: 'Peut-être', counted: true },
    { id: 'non', label: 'Non', counted: true },
    { id: 'removed', label: 'Disparues', counted: true },
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
