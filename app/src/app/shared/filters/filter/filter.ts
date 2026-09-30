import { TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Months } from '../../../shared/enums/months.enum';
import { ThousandSeparatorDirective } from '../../directives/thousand-separator.directive';
import { Dropdown } from '../../dropdown/dropdown';
import { TableCellType } from '../../table/table.enum';
import { TableAttribute } from '../../table/table.type';

@Component({
  selector: 'app-filter',
  imports: [FormsModule, TitleCasePipe, Dropdown, ThousandSeparatorDirective],
  templateUrl: './filter.html',
  styleUrls: ['./filter.scss']
})
export class Filter {
  @Input() attributes!: TableAttribute[];
  @Output() refresh = new EventEmitter();

  filterAttributes: TableAttribute[] = [];

  filters: { [key: string]: { value: any, label: string } } | null = null;
  TableCellType = TableCellType;

  months = Object.keys(Months).filter(key => isNaN(Number(key)));
  years = Array.from({ length: new Date().getFullYear() - 2020 + 2 }, (_, i) => 2020 + i);

  loadFilters(filters: any) {
    const filtersCopy = { ...filters };

    this.filterAttributes = this.attributes
      .filter(attr => attr.hasOwnProperty('isFilter') ? attr.isFilter : true)
      .map(attr => {
        const attrCopy = { ...attr };
        const filterKey = attrCopy.filterKey || attrCopy.name;

        const isNumeric = this.isNumericType(attrCopy.type);
        const defaultValue = attrCopy.type === TableCellType.Date ? { from: null, to: null } : isNumeric ? { min: null, max: null } : null;
        filtersCopy[filterKey] = filtersCopy[filterKey] || { value: defaultValue, label: attrCopy.label || attrCopy.name };
        if (attrCopy.type === TableCellType.Date && (filtersCopy[filterKey].value === null || typeof filtersCopy[filterKey].value !== 'object')) {
          filtersCopy[filterKey].value = { from: null, to: null };
        }
        if (isNumeric && (filtersCopy[filterKey].value === null || typeof filtersCopy[filterKey].value !== 'object')) {
          filtersCopy[filterKey].value = { min: null, max: null };
        }

        // Badge and Badges

        if ((attrCopy.type === TableCellType.Badge || attrCopy.type === TableCellType.Badges) && attrCopy.values) {
          attrCopy.values = attrCopy.values.map((value, index) => {
            if (typeof value === 'string') {
              return {
                id: index + 1,
                value: value,
                color: (attrCopy.options && typeof attrCopy.options.color === 'function') ? attrCopy.options.color(value) : 'transparent'
              };
            }
            return value;
          });

          if (attrCopy.type === TableCellType.Badge && filtersCopy[filterKey].value) {
            filtersCopy[filterKey].value = attrCopy.values.find(v => v.value === filtersCopy[filterKey].value) || filtersCopy[filterKey].value;
          }

          if (attrCopy.type === TableCellType.Badges && Array.isArray(filtersCopy[filterKey]?.value)) {
            filtersCopy[filterKey].value = filtersCopy[filterKey].value
              .map((filterVal: any) => attrCopy.values?.find(v => v.value === filterVal))
              .filter((found: any) => found !== undefined);
          }
        }

        return attrCopy;
      });

    this.filters = filtersCopy;
  }

  applyFilters() {
    const transformedFilters = Object.keys(this.filters ?? {}).reduce((acc: { [key: string]: { value: any, label: string } }, key: string) => {
      const filterValue = (this.filters ?? {})[key].value;

      const isEmptyDateRange = filterValue && typeof filterValue === 'object' && !Array.isArray(filterValue) && 'from' in filterValue && !filterValue.from && !filterValue.to;
      const isEmptyNumberRange = filterValue && typeof filterValue === 'object' && !Array.isArray(filterValue) && 'min' in filterValue && filterValue.min == null && filterValue.max == null;
      if ((Array.isArray(filterValue) && filterValue.length === 0) || filterValue === null || filterValue === undefined || isEmptyDateRange || isEmptyNumberRange) {
        return acc;
      }

      acc[key] = {
        label: (this.filters ?? {})[key].label,
        value: (typeof filterValue === 'object' && filterValue !== null && filterValue.value)
          ? filterValue.value
          : Array.isArray(filterValue) && filterValue.length > 0 && filterValue[0].hasOwnProperty('value')
            ? filterValue.map(item => item.value)
            : filterValue
      }

      return acc;
    }, {} as { [key: string]: { value: any, label: string } });

    this.refresh.emit(transformedFilters);
    this.filters = null;
  }

  close() {
    this.filters = null;
  }

  getFilterKey(attribute: TableAttribute): string {
    return attribute.filterKey || attribute.name;
  }

  isNumericType(type: TableCellType): boolean {
    return type === TableCellType.Number || type === TableCellType.Percent || type === TableCellType.Currency || type === TableCellType.Range;
  }

  getDropdownAttributes(attribute: TableAttribute): string[] | undefined {
    return attribute.values?.length && typeof attribute.values[0] === 'object' ? ['value'] : undefined;
  }
}