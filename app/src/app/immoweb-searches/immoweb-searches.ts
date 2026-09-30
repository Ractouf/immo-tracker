import { Component, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';
import { ImmowebSearch, immowebSearchSummary } from '../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../shared/services/immoweb-searches.service';

@Component({
  selector: 'app-immoweb-searches',
  templateUrl: './immoweb-searches.html',
  styleUrl: './immoweb-searches.scss',
})
export class ImmowebSearches {
  @Output() create = new EventEmitter<void>();
  @Output() manage = new EventEmitter<void>();
  @Output() editSearch = new EventEmitter<ImmowebSearch>();

  readonly summary = immowebSearchSummary;
  menuOpen = false;

  constructor(
    readonly searchesService: ImmowebSearchesService,
    private readonly elementRef: ElementRef,
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.menuOpen = false;
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  activate(search: ImmowebSearch): void {
    this.searchesService.setActive(search.id, true);
    this.menuOpen = false;
  }

  deactivate(search: ImmowebSearch): void {
    this.searchesService.setActive(search.id, false);
  }

  newSearch(): void {
    this.menuOpen = false;
    this.create.emit();
  }

  openModal(): void {
    this.menuOpen = false;
    this.manage.emit();
  }
}
