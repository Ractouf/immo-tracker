import { TableAction } from "./table.type";

export class TableOption {

  pageSizeOptions: number[] = [10, 25, 50, 100];
  initPageSize: number = 25;
  hidePagination: boolean = false;

  actions?: TableAction[];

  constructor(model?: Partial<TableOption>) {
    Object.assign(this, model);
  }
}