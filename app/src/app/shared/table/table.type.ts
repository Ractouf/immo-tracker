import { TableCellType } from "./table.enum";

export const SELECTION = 'selection';

export type SortStrategy = (a: unknown, b: unknown) => number;
export type SortStrategyMap = Partial<{ [key in TableCellType]: SortStrategy }> & { default: SortStrategy, action: () => number };

export type PageChanged = {
  currentPage: number;
  itemsPerPage: number;
  limitChanged: boolean;
};

export type TableAction = {
  label: string;

  /** Will use the label by default but can be overwritten. */
  title?: string | null | undefined;

  icon?: string;
  color?: string;
  backgroundColor?: string;
  hiddenFn?: (item: unknown) => boolean;
  iconFn?: (item: unknown) => string;
  colorFn?: (item: unknown) => string;
};

export type TableActionEvent<T = unknown> = {
  action: TableAction;
  item: T;
};

export type TableAttribute = {
  name: string;

  label?: string;
  rawLabel?: string;

  type: TableCellType;

  // Path to the field in the array of objects.
  path?: string;

  // Unique key for filters (when name is shared between multiple attributes)
  filterKey?: string;

  size?: string;

  classes?: string[];
  sorted?: -1 | 0 | 1 | 2;
  sortable?: boolean;

  color?: string;

  isFilter?: boolean;
  isTable?: boolean;

  values?: any[];

  multi?: boolean;

  options?: TableAttributeOptions;

  // Custom comparison function for filtering
  filterComparison?: (itemValue: any, filterValue: any, item?: any) => boolean;
};

export type TableAttributeOptions = {

  // Color
  color?: Function;

  // Boolean
  true?: { label: string, color: string };
  false?: { label: string, color: string };

  // Date / number / ...
  format?: string;

  // Date
  timezone?: string;

  // Profile Picture
  name?: string;

  // Select
  options?: {
    label: string;
    value: any;
  }[];

  // Tags
  tags?: {
    label: string;
    color: string;
  }[];

  // Progress Bar
  /** Name of the field with the goal. */
  goal?: string;
  /** Name of the field with the progress. */
  progress?: string;

  // Input
  inputType?: 'text' | 'number';
  inputPrefix?: string;
  inputStep?: string;
  inputMin?: number;

  titleTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  subtitleKey?: string;

  // TextBadge
  /** Path to the field holding the badge text; badge is hidden when the resolved value is falsy. */
  badgeKey?: string;
  badgeColor?: string;

  // BooleanGroup
  booleanItems?: { key: string; label: string }[];
};