import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../shared/badge/badge';
import { Dropdown } from '../../shared/dropdown/dropdown';
import { Filters } from '../../shared/filters/filters';
import { Paginator } from '../../shared/paginator/paginator';
import { Search } from '../../shared/search/search';
import { TableAttribute } from '../../shared/table/table.type';
import { LISTING_SORT_FIELDS, ListingSortField, SortDirection } from '../../shared/utils/listing-sort';

@Component({
  selector: 'app-filter-bar',
  imports: [FormsModule, Badge, Dropdown, Filters, Paginator, Search],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class FilterBar {
  @ViewChild('search') searchComponent!: Search;
  @ViewChild('filters') filtersComponent!: Filters;

  @Input() expanded = true;
  @Input({ required: true }) items!: any[];
  @Input({ required: true }) filteredItems!: any[];
  @Input({ required: true }) attributes!: TableAttribute[];
  @Input() showSort = true;
  @Input() sortField!: ListingSortField;
  @Input() sortDirection!: SortDirection;
  @Input() showPaginator = false;
  @Input() page = 0;
  @Input() pageSize = 48;
  @Input() pageUrl?: (page: number) => string;
  @Output() filtered = new EventEmitter<any[]>();
  @Output() sortFieldChange = new EventEmitter<ListingSortField>();
  @Output() toggleSortDirection = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  readonly sortFields = LISTING_SORT_FIELDS;
}
