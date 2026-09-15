import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  search(table: any[], filterBy: string, attributes?: any[]): any[] {

    let filteredTable = [] as any[];

    if (!attributes) {
      let columns = {} as any;
      for (const o of table) {
        const keys = Object.keys(o);
        for (const k of keys) {
          columns[k] = k;
        }
      }
      columns = Object.keys(columns);
      attributes = [];
      for (const c of columns) {
        attributes.push({ name: c });
      }
    }

    const getPath = (a: { name?: string; formatted?: string }) => (a.formatted ?? a.name ?? '');

    if (!filterBy) { filterBy = ''; }
    const filters = [this.formatItem(filterBy).toLowerCase().trim()];

    // When the search field is empty, the table has one empty string
    if (filters.length === 1 && filters[0] !== '') {
      filteredTable = table.filter(p => {

        // For all the attributes of the object
        for (const a of attributes) {
          const path = getPath(a);
          const values: any[] = path ? [this.getValue(path, p)] : [];
          // TitleSubtitle: also search in subtitle (e.g. Applicant = firstName + lastName)
          const subtitleKey = (a as { options?: { subtitleKey?: string } }).options?.subtitleKey;
          if (subtitleKey) {
            values.push(this.getValue(subtitleKey, p));
          }

          for (const value of values) {
            if (value == null) continue;
            const str = String(value);

            // Check all the filter to see if it matches at least one
            for (const filter of filters) {

              // If the value is not a number
              if (isNaN(+str) && this.formatItem(str).toLowerCase().includes(filter)) {
                return true;

                // If the value and the filter are numbers
              } else if (!isNaN(+str) && !isNaN(+filter) && +str === +filter) {
                return true;

              }
            }
          }
        }

        return false;
      });

    } else {
      filteredTable = table;
    }

    return filteredTable;
  }

  private getValue(path: string, item: any): any {
    if (!path) return undefined;
    return path.split('.').reduce((prev: any, key) => (prev != null ? prev[key] : undefined), item);
  }

  formatItem(item: string): string {
    return item.toLowerCase().replace(/[àâ]/g, 'a').replace(/[éèê]/g, 'e');
  }
}