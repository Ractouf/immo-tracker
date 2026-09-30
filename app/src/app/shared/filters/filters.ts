import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CamelCaseToTitlePipe } from "../pipes/camel-case-to-title.pipe";
import { Search } from '../search/search';
import { Months } from '../shared/../enums/months.enum';
import { TableCellType } from '../table/table.enum';
import { TableAttribute } from '../table/table.type';
import { Filter } from './filter/filter';

@Component({
  selector: 'app-filters',
  imports: [CamelCaseToTitlePipe, Filter],
  templateUrl: './filters.html',
  styleUrls: ['./filters.scss']
})
export class Filters {

  @Input() items!: any[];
  @Input() filteredItems!: any[];
  @Input() search!: Search;
  @Input() attributes!: TableAttribute[];
  @Output() filtered = new EventEmitter();
  @ViewChild(Filter) filter!: Filter;

  filters: { [key: string]: { value: any, label: string } } = {};
  filtersArray: any[] = [];
  months = Object.keys(Months).filter(key => isNaN(Number(key)));

  // Filters

  async editFilters() {
    this.filter.loadFilters(this.filters);
  }

  removeFilter(filter: { key: string, label: string, value: any }) {
    this.search.search(0);

    delete this.filters[filter.key!];
    this.applyFilters(this.filters);
  }

  _applyFilters(event?: any[]) {
    this.applyFilters(this.filters, event);
  }

  applyFilters(filters: { [key: string]: { value: any, label: string } }, event?: any[]) {
    this.filters = filters;
    let itemsToFilter;
    event ? itemsToFilter = event : this.search.searchBy === '' ? (itemsToFilter = this.items) : (itemsToFilter = this.filteredItems);
    this.filteredItems = this.applyFiltersTo(itemsToFilter, filters, this.attributes);

    this.filtersArray = Object.entries(this.filters).map(([key, { value, label }]) => ({ label, value, key }));
    this.filtered.emit(this.filteredItems);
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

        if (value && typeof value === 'object' && !Array.isArray(value) && ('from' in value || 'to' in value)) {
          if (!this.applyDateRangeComparison(itemValue, value)) return false;
        } else if (value && typeof value === 'object' && !Array.isArray(value) && ('min' in value || 'max' in value)) {
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

  getFilterDisplayLabel(filter: { key: string, label: string, value: any }): string {
    const value = filter.value;

    if (this.isArray(value)) return this.getFilterArrayValue(value.map((v: any) => this.formatFilterValue(filter.key, v)));
    if (this.isDateRange(value)) return this.getDateRangeLabel(value);
    if (this.isNumberRange(value)) return this.getNumberRangeLabel(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    return this.formatFilterValue(filter.key, value);
  }

  private formatFilterValue(key: string, rawValue: any): string {
    const attribute = this.attributes.find(attr => (attr.filterKey || attr.name) === key);
    const option = attribute?.values?.find((v: any) => typeof v === 'object' && v.id === rawValue);
    if (option) return option.value;

    return typeof rawValue === 'string' ? this.camelCaseToTitlePipe.transform(rawValue) : rawValue;
  }

  private readonly camelCaseToTitlePipe = new CamelCaseToTitlePipe();

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isDateRange(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value) && ('from' in value || 'to' in value);
  }

  getDateRangeLabel(value: { from?: string, to?: string }): string {
    if (value.from && value.to) return `${value.from} – ${value.to}`;
    if (value.from) return `From ${value.from}`;
    if (value.to) return `To ${value.to}`;
    return '';
  }

  isNumberRange(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value) && ('min' in value || 'max' in value);
  }

  getNumberRangeLabel(value: { min?: number | null, max?: number | null }): string {
    const format = (n: number) => new Intl.NumberFormat('fr-BE').format(n);
    if (value.min != null && value.max != null) return `${format(value.min)} – ${format(value.max)}`;
    if (value.min != null) return `${format(value.min)} and up`;
    if (value.max != null) return `Up to ${format(value.max)}`;
    return '';
  }

  getFilterArrayValue(value: string[]): string {
    return value.length > 1 ? value.join(', ') : value[0] || '';
  }

  // Comparison strategies

  private applyDateRangeComparison(itemValue: any, range: { from?: string, to?: string }): boolean {
    if (!itemValue) return false;
    const date = new Date(itemValue);
    if (range.from && date < new Date(range.from)) return false;
    if (range.to && date > new Date(range.to)) return false;
    return true;
  }

  private applyNumberRangeComparison(itemValue: any, range: { min?: number | null, max?: number | null }): boolean {
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