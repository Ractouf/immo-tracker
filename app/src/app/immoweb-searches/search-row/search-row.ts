import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImmowebSearch, immowebSearchSummary } from '../../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../../shared/services/immoweb-searches.service';
import { Toggle } from '../../shared/toggle/toggle';

@Component({
  selector: 'app-search-row',
  imports: [FormsModule, Toggle],
  templateUrl: './search-row.html',
})
export class SearchRow {
  @Input({ required: true }) search!: ImmowebSearch;
  @Input({ required: true }) toggleId!: string;
  @Input() removable = false;
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  constructor(
    readonly searchesService: ImmowebSearchesService,
    @Inject(LOCALE_ID) private readonly locale: string,
  ) {}

  get summary(): string {
    return immowebSearchSummary(this.search, this.locale);
  }
}
