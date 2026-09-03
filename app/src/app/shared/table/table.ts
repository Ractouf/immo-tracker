import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isBefore, isEqual } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Badge } from "../badge/badge";
import { Dropdown } from '../dropdown/dropdown';
import { EmptyPipe } from "../pipes/empty.pipe";
import { ProfilePicture } from "../profile-picture/profile-picture";
import { TableCellType } from './table.enum';
import { TableOption } from './table.model';
import { PageChanged, SELECTION, SortStrategyMap, TableAction, TableActionEvent, TableAttribute } from './table.type';

@Component({
  selector: 'app-table',
  imports: [CommonModule, FormsModule, EmptyPipe, Badge, ProfilePicture, Dropdown],
  templateUrl: './table.html',
  styleUrls: ['./table.scss']
})
export class Table implements OnInit, OnChanges {

  // Inputs
  @Input() items: any[] = [];
  @Input() itemCount?: number;
  @Input() attributes: TableAttribute[] = [];
  @Input() options: TableOption = new TableOption();
  @Input() useServerSidePagination = false;

  // Outputs
  /** Will emit an event when the user click on an action provided via the options.
   *
   * It will emit the action `selection` when a user clicks on the row.
   */
  @Output() action = new EventEmitter<TableActionEvent<any>>();
  @Output() pageChanged = new EventEmitter<PageChanged>();
  @Output() sorted = new EventEmitter<TableAttribute>();
  @Output() cellChange = new EventEmitter<{ item: any; attribute: TableAttribute; value: any }>();

  filtered = false;
  sortBy: TableAttribute | null = null;
  pagedItems: any[] = [];
  itemsPerPage = 25;
  numberOfPages: number = 0;
  currentPage = 0;
  start = this.currentPage * this.itemsPerPage;
  end = (this.currentPage + 1) * this.itemsPerPage;

  TableCellType = TableCellType;

  constructor(@Inject(DeviceDetectorService) private deviceService: DeviceDetectorService) { }

  ngOnInit() {
    this.itemsPerPage = this.options.initPageSize;

    if (this.useServerSidePagination) {
      if (this.items) {
        this.pagedItems = this.items;
        this.pageItems();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.useServerSidePagination) {
      if (changes['itemCount']) {
        this.numberOfPages = Math.ceil((this.itemCount || 0) / this.itemsPerPage) - 1;
        this.currentPage = 0;
      }

      if (changes['items']) {
        this.pagedItems = this.items;
      }

    } else {
      this.currentPage = 0;
      if (this.items) {
        this.filtered = this.items.filter(i => i.hide).length > 0;
        this.pageItems();
        this.sortItems();
      }
    }
  }

  sortItems() {
    if (!this.sortBy) return;

    this.attributes = this.attributes.map(a => ({
      ...a,
      sorted: a.name === this.sortBy!.name ? !this.sortBy!.sorted || this.sortBy!.sorted === 2 ? 1 : 2 : 0
    }));

    if (!this.useServerSidePagination) {

      const reverse = this.sortBy!.sorted === 1 ? -1 : 1;
      const getVal = (item: any) => this.getValue(this.sortBy!.name, item);
      const numberStrategy = (a: any, b: any) => (+getVal(a) - +getVal(b)) * reverse;

      const strategies: SortStrategyMap = {
        action: () => 0,
        default: (a: any, b: any) => `${getVal(a) ?? ''}`.toLowerCase().localeCompare(`${getVal(b) ?? ''}`.toLowerCase()) * reverse,
        [TableCellType.Badge]: (a: any, b: any) => (getVal(a) ?? '').toLowerCase().localeCompare((getVal(b) ?? '').toLowerCase()) * reverse,
        [TableCellType.Boolean]: (a: any, b: any) => ((getVal(a) === getVal(b)) ? 0 : getVal(a) ? 1 : -1) * reverse,
        [TableCellType.Date]: (a: any, b: any) => (isEqual(getVal(a), getVal(b)) ? 0 : isBefore(getVal(a), getVal(b)) ? 1 : -1) * reverse,
        [TableCellType.Number]: numberStrategy,
        [TableCellType.Currency]: numberStrategy,
        [TableCellType.Percent]: numberStrategy,
        [TableCellType.Input]: numberStrategy,
        [TableCellType.TitleSubtitle]: (a: any, b: any) => (getVal(a) ?? '').toLowerCase().localeCompare((getVal(b) ?? '').toLowerCase()) * reverse,
      };

      this.items.sort(strategies[this.sortBy!.type] || strategies.default);

      this.currentPage = 0;
      this.pageItems();

    } else {
      this.sorted.emit(this.sortBy);
    }
  }

  pageItems() {
    if (!this.items) return;

    this.updatePaging(0);
    this.numberOfPages = Math.ceil(this.items.length / this.itemsPerPage) - 1;
    this.items = this.items.filter(i => !i.hide);
    this.pagedItems = this.items.slice(this.start, this.end);
  }

  nextPage() {
    if (this.currentPage < this.numberOfPages) {
      this.updatePaging(++this.currentPage);

      if (!this.useServerSidePagination) {
        this.pagedItems = this.items.slice(this.start, this.end);
      }

      this.pageChanged.emit({ currentPage: this.currentPage, itemsPerPage: +this.itemsPerPage, limitChanged: false });
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.updatePaging(--this.currentPage);

      if (!this.useServerSidePagination) {
        this.pagedItems = this.items.slice(this.start, this.end);
      }

      this.pageChanged.emit({ currentPage: this.currentPage, itemsPerPage: +this.itemsPerPage, limitChanged: false });
    }
  }

  itemsPerPageChange() {
    if (this.useServerSidePagination) {
      this.numberOfPages = Math.ceil((this.itemCount || 0) / this.itemsPerPage) - 1;
      this.currentPage = 0;

      this.pageChanged.emit({ currentPage: this.currentPage, itemsPerPage: +this.itemsPerPage, limitChanged: true });
      this.updatePaging();

    } else {
      this.pageItems();
    }
  }

  sort(attribute: TableAttribute) {
    if (attribute.sortable !== false) {
      this.sortBy = attribute;
      this.sortItems();
    }
  }

  actionClicked(action: TableAction, item: any) {
    this.action.emit({ action, item });
  }

  onInputBlur(item: any, attribute: TableAttribute): void {
    const value = this.getValue(attribute.name, item);
    this.cellChange.emit({ item, attribute, value });
  }

  clickItem(item: any) {
    this.selectItem(item);
  }

  /** Emit an action when the user clicks on a line. */
  selectItem(item: any) {
    this.actionClicked({ label: SELECTION }, item);
  }

  getValue(path: string, item: any): any {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined;
    }, item || self);
  }

  setValue(path: string, item: any, value: any): void {
    if (!item) return;
    const parts = path.split('.');
    const last = parts.pop();
    const parent = parts.length
      ? parts.reduce((prev, curr) => (prev ? prev[curr] : undefined), item)
      : item;
    if (parent && last) {
      parent[last] = value;
    }
  }

  getValues(name: string, item: any, path: string): any[] {
    const values = this.getValue(name, item);
    if (Array.isArray(values)) {
      return values.map(v => {
        if (typeof v !== 'object' || v === null) {
          return v;
        }
        return this.getValue(path, v);
      });
    } else if (typeof values === 'object') {
      return [values[name]];
    }
    return [];
  }

  private updatePaging(currentPage?: number) {
    if (currentPage != undefined) {
      this.currentPage = currentPage;
    }
    this.start = this.currentPage * this.itemsPerPage;
    this.end = (this.currentPage + 1) * this.itemsPerPage;
  }

  formatStatus(status: string): string {
    return status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  }

  get hasActions(): boolean {
    return !!this.options && Array.isArray(this.options.actions) && this.options.actions.length > 0;
  }

  get itemLength() {
    if (this.useServerSidePagination && this.itemCount) {
      return this.itemCount;
    } else if (!this.useServerSidePagination && this.items) {
      return this.items.length;
    }
    return 0;
  }
}