import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableAttribute } from '../table/table.type';
import { SearchService } from './search.service';

@Component({
  selector: 'app-search',
  imports: [
    FormsModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search {

  @Input() array: any[] = [];
  @Input() attributes?: TableAttribute[];
  @Input() placeholder = 'Search';
  @Input() useServerSideSearch?: boolean;
  @Input() delay = 300;
  @Input() maxWidth?: string;

  @Output() refresh = new EventEmitter<any[]>();
  @Output() searchByChanges = new EventEmitter<string>();

  // timeout: NodeJS.Timeout;
  timeout: any;
  searchBy = '';

  constructor(private searchService: SearchService) { }

  search(delay: number = this.delay) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      const cleanSearchInput = this.searchBy.trim();

      if (!this.useServerSideSearch) {
        const results = this.searchService.search(this.array, cleanSearchInput, this.attributes);
        this.refresh.emit(results);
      }

      this.searchByChanges.emit(cleanSearchInput);
    }, delay);
  }

  formatItem(item: string): string {
    return item.toLowerCase().replace(/[àâ]/g, 'a').replace(/[éèê]/g, 'e');
  }
}
