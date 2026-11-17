import { TableCellType } from '../table/table.enum';

export type NumberRange = { min?: number | null; max?: number | null };
export type DateRange = { from?: string | null; to?: string | null };

const RANGE_TYPES = [TableCellType.Number, TableCellType.Percent, TableCellType.Currency, TableCellType.Range];

export function isRangeType(type: TableCellType): boolean {
  return RANGE_TYPES.includes(type);
}

export function isNumberRange(value: unknown): value is NumberRange {
  return isPlainObject(value) && ('min' in value || 'max' in value);
}

export function isDateRange(value: unknown): value is DateRange {
  return isPlainObject(value) && ('from' in value || 'to' in value);
}

function isPlainObject(value: unknown): value is object {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
