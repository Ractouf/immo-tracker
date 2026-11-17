import { Component, ElementRef, EventEmitter, HostListener, Inject, LOCALE_ID, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../shared/badge/badge';
import { ImmowebSearch, immowebSearchSummary } from '../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../shared/services/immoweb-searches.service';
import { Toggle } from '../shared/toggle/toggle';

@Component({
  selector: 'app-immoweb-searches',
  imports: [FormsModule, Badge, Toggle],
  templateUrl: './immoweb-searches.html',
  styleUrl: './immoweb-searches.scss',
})
export class ImmowebSearches {
  @Output() create = new EventEmitter<void>();
  @Output() manage = new EventEmitter<void>();
  @Output() editSearch = new EventEmitter<ImmowebSearch>();

  menuOpen = false;

  constructor(
    readonly searchesService: ImmowebSearchesService,
    private readonly elementRef: ElementRef,
    @Inject(LOCALE_ID) private readonly locale: string,
  ) { }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.menuOpen = false;
    }
  }

  newSearch(): void {
    this.menuOpen = false;
    this.create.emit();
  }

  edit(search: ImmowebSearch): void {
    this.menuOpen = false;
    this.editSearch.emit(search);
  }

  openModal(): void {
    this.menuOpen = false;
    this.manage.emit();
  }

  summary(search: ImmowebSearch): string {
    return immowebSearchSummary(search, this.locale);
  }
}
