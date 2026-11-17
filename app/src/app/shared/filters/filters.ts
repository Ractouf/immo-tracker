import { TitleCasePipe, formatNumber } from '@angular/common';
import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output, ViewChild } from '@angular/core';
import { Search } from '../search/search';
import { TableCellType } from '../table/table.enum';
import { TableAttribute } from '../table/table.type';
import { DateRange, NumberRange, isDateRange, isNumberRange } from '../utils/filter-ranges';
import { Filter } from './filter/filter';

@Component({
  selector: 'app-filters',
  imports: [TitleCasePipe, Filter],
  templateUrl: './filters.html',
  styleUrls: ['./filters.scss']
})
export class Filters {
  @ViewChild(Filter) filter!: Filter;

  @Input() items!: any[];
  @Input() filteredItems!: any[];
  @Input() search!: Search;
  @Input() attributes!: TableAttribute[];

  @Output() filtered = new EventEmitter();

  filters: { [key: string]: { value: any, label: string } } = {};
  filtersArray: any[] = [];

  private readonly titleCasePipe = new TitleCasePipe();

  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  async editFilters() {
    this.filter.loadFilters(this.filters);
  }

  applyFilters(filters: { [key: string]: { value: any, label: string } }, event?: any[]) {
    this.filters = filters;
    let itemsToFilter;
    event ? itemsToFilter = event : this.search.searchBy === '' ? (itemsToFilter = this.items) : (itemsToFilter = this.filteredItems);
    this.filteredItems = this.applyFiltersTo(itemsToFilter, filters, this.attributes);

    this.filtersArray = Object.entries(this.filters).map(([key, { value, label }]) => ({ label, value, key }));
    this.filtered.emit(this.filteredItems);
  }

  _applyFilters(event?: any[]) {
    this.applyFilters(this.filters, event);
  }

  applyFiltersTo(items: any[], filters: { [key: string]: { value: any, label: string } } = this.filters, attributes: TableAttribute[] = this.attributes): any[] {
    return items.filter(item => {
      for (let [key, { value }] of Object.entries(filters)) {
        const attribute = attributes.find(attr => (attr.filterKey || attr.name) === key);
        let itemValue;

        const dataPropertyName = attribute?.name || key;

        if (attribute?.type === TableCellType.TitleSubtitle) {
          const titleVal = this.getValue(attribute.name, item);
          const subtitleVal = attribute.options?.subtitleKey ? this.getValue(attribute.options.subtitleKey, item) : undefined;
          itemValue = [titleVal, subtitleVal];
        } else if (attribute?.path) {
          const pathParts = attribute.path.split('.');
          if (Array.isArray(item[dataPropertyName])) {
            itemValue = item[dataPropertyName].map((arrayItem: any) => {
              if (typeof arrayItem !== 'object' || arrayItem === null) {
                return arrayItem;
              }
              let nestedValue = arrayItem;
              for (const part of pathParts) {
                nestedValue = nestedValue?.[part];
              }
              return nestedValue;
            });
          } else {
            itemValue = item[dataPropertyName];
            for (const part of pathParts) {
              itemValue = itemValue?.[part];
            }
          }
        } else {
          const nameParts = dataPropertyName.split('.');
          itemValue = item;
          for (const part of nameParts) {
            if (itemValue == null || !itemValue.hasOwnProperty(part)) {
              return false;
            }
            itemValue = itemValue[part];
          }
        }

        if (isDateRange(value)) {
          if (!this.applyDateRangeComparison(itemValue, value)) return false;
        } else if (isNumberRange(value)) {
          if (!this.applyNumberRangeComparison(itemValue, value)) return false;
        } else if (attribute?.filterComparison) {
          if (!this.applyCustomComparison(itemValue, value, attribute.filterComparison, item)) {
            return false;
          }
        } else {
          if (!this.applyDefaultComparison(itemValue, value)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  removeFilter(filter: { key: string, label: string, value: any }) {
    this.search.search(0);

    delete this.filters[filter.key!];
    this.applyFilters(this.filters);
  }

  clearFilters() {
    this.filters = {};
    this.filtersArray = [];
    this.search.search(0);
  }

  getFilterDisplayLabel(filter: { key: string, label: string, value: any }): string {
    const value = filter.value;

    if (this.isArray(value)) return this.getFilterArrayValue(value.map((v: any) => this.formatFilterValue(filter.key, v)));
    if (isDateRange(value)) return this.getDateRangeLabel(value);
    if (isNumberRange(value)) return this.getNumberRangeLabel(value);
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

    return this.formatFilterValue(filter.key, value);
  }

  getFilterArrayValue(value: string[]): string {
    return value.length > 1 ? value.join(', ') : value[0] || '';
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getDateRangeLabel(value: DateRange): string {
    if (value.from && value.to) return `${value.from} – ${value.to}`;
    if (value.from) return `From ${value.from}`;
    if (value.to) return `To ${value.to}`;
    return '';
  }

  getNumberRangeLabel(value: NumberRange): string {
    const format = (n: number) => formatNumber(n, this.locale);
    if (value.min != null && value.max != null) return `${format(value.min)} – ${format(value.max)}`;
    if (value.min != null) return `${format(value.min)} and up`;
    if (value.max != null) return `Up to ${format(value.max)}`;
    return '';
  }

  private formatFilterValue(key: string, rawValue: any): string {
    const attribute = this.attributes.find(attr => (attr.filterKey || attr.name) === key);
    const option = attribute?.values?.find((v: any) => typeof v === 'object' && v.id === rawValue);
    if (option) return option.value;

    return typeof rawValue === 'string' ? this.titleCasePipe.transform(rawValue) : rawValue;
  }

  private applyDateRangeComparison(itemValue: any, range: DateRange): boolean {
    if (!itemValue) return false;
    const date = new Date(itemValue);
    if (range.from && date < new Date(range.from)) return false;
    if (range.to && date > new Date(range.to)) return false;
    return true;
  }

  private applyNumberRangeComparison(itemValue: any, range: NumberRange): boolean {
    if (itemValue === null || itemValue === undefined || itemValue === '') return false;
    const num = Number(itemValue);
    if (isNaN(num)) return false;
    if (range.min != null && num < range.min) return false;
    if (range.max != null && num > range.max) return false;
    return true;
  }

  private applyCustomComparison(
    itemValue: any,
    filterValue: any,
    comparisonFn: (itemValue: any, filterValue: any, item?: any) => boolean,
    item: any
  ): boolean {
    if (Array.isArray(filterValue)) {
      return filterValue.some(filterVal => {
        if (Array.isArray(itemValue)) {
          return itemValue.some(iv => comparisonFn(iv, filterVal, item));
        } else {
          return comparisonFn(itemValue, filterVal, item);
        }
      });
    } else {
      if (Array.isArray(itemValue)) {
        return itemValue.some(iv => comparisonFn(iv, filterValue, item));
      } else {
        return comparisonFn(itemValue, filterValue, item);
      }
    }
  }

  private applyDefaultComparison(itemValue: any, filterValue: any): boolean {
    if (Array.isArray(filterValue)) {
      if (Array.isArray(itemValue)) {
        return filterValue.every(filterVal => this.compareValues(itemValue, filterVal));
      }
      return filterValue.some(filterVal => this.compareValues(itemValue, filterVal));
    } else {
      return this.compareValues(itemValue, filterValue);
    }
  }

  private compareValues(itemValue: any, filterValue: any): boolean {
    if (Array.isArray(itemValue)) {
      return itemValue.some(iv => this.performComparison(iv, filterValue));
    } else {
      return this.performComparison(itemValue, filterValue);
    }
  }

  private performComparison(itemValue: any, filterValue: any): boolean {
    if (typeof filterValue === 'boolean') {
      return itemValue === filterValue;
    }

    return itemValue?.toString().toLowerCase().includes(filterValue?.toString().toLowerCase());
  }

  private getValue(path: string, item: any): any {
    return path.split('.').reduce((prev, curr) => (prev != null ? prev[curr] : undefined), item);
  }
}