import { TableCellType } from '../table/table.enum';
import { TableAttribute } from '../table/table.type';

export type FilterState = { [key: string]: { value: any; label: string } };

const RANGE_TYPES = [TableCellType.Number, TableCellType.Percent, TableCellType.Currency, TableCellType.Range];

export function filtersToParams(filters: FilterState, attributes: TableAttribute[], params: URLSearchParams): void {
  for (const attribute of attributes) {
    const value = filters[filterKey(attribute)]?.value;
    if (!attribute.param || value === null || value === undefined) continue;
    for (const encoded of encodeValue(attribute, value)) params.append(attribute.param, encoded);
  }
}

export function paramsToFilters(params: URLSearchParams, attributes: TableAttribute[]): FilterState {
  const filters: FilterState = {};
  for (const attribute of attributes) {
    if (!attribute.param || attribute.isFilter === false) continue;
    const raw = params.getAll(attribute.param);
    if (!raw.length) continue;
    const value = decodeValue(attribute, raw);
    if (value !== null) filters[filterKey(attribute)] = { value, label: attribute.label || attribute.name };
  }
  return filters;
}

function encodeValue(attribute: TableAttribute, value: any): string[] {
  if (typeof value === 'boolean') return [value ? 'yes' : 'no'];
  if (RANGE_TYPES.includes(attribute.type)) return [`${value.min ?? ''}-${value.max ?? ''}`];
  return [value].flat().map((v) => attribute.paramValues?.[String(v)] ?? String(v));
}

function decodeValue(attribute: TableAttribute, raw: string[]): any {
  if (attribute.type === TableCellType.Boolean) return raw[0] === 'yes' ? true : raw[0] === 'no' ? false : null;
  if (RANGE_TYPES.includes(attribute.type)) {
    const [min, max] = raw[0].split('-').map(toNumberOrNull);
    return min === null && max === null ? null : { min, max };
  }
  const values = raw.map((v) => Object.entries(attribute.paramValues ?? {}).find(([, param]) => param === v)?.[0] ?? v);
  return attribute.multi ? values : values[0];
}

function filterKey(attribute: TableAttribute): string {
  return attribute.filterKey || attribute.name;
}

function toNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}
