import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BRUSSELS_MUNICIPALITIES } from '../../shared/constants/municipalities';
import { ThousandSeparatorDirective } from '../../shared/directives/thousand-separator.directive';
import { Dropdown } from '../../shared/dropdown/dropdown';
import { ImmowebSearch, immowebSearchSummary, PROPERTY_TYPE_OPTIONS } from '../../shared/models/immoweb-search.model';
import { ImmowebSearchesService } from '../../shared/services/immoweb-searches.service';
import { Toggle } from '../../shared/toggle/toggle';

type SearchDraft = Omit<ImmowebSearch, 'postalCodes'> & { postalCodes: string };

@Component({
  selector: 'app-immoweb-search-modal',
  imports: [FormsModule, Dropdown, Toggle, ThousandSeparatorDirective],
  templateUrl: './search-modal.html',
  styleUrl: './search-modal.scss',
})
export class ImmowebSearchModal {
  readonly propertyTypeOptions = PROPERTY_TYPE_OPTIONS;
  readonly quickPostalCodes = Object.entries(BRUSSELS_MUNICIPALITIES).map(([code, name]) => ({ code, name }));
  readonly summary = immowebSearchSummary;

  modalOpen = false;
  draft: SearchDraft | null = null;
  draftError: string | null = null;
  private draftFromList = false;

  constructor(readonly searchesService: ImmowebSearchesService) { }

  openModal(): void {
    this.modalOpen = true;
    this.draft = null;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.draft = null;
  }

  newSearch(): void {
    this.draftFromList = this.modalOpen;
    this.modalOpen = true;
    this.draftError = null;
    this.draft = {
      id: crypto.randomUUID(),
      name: '',
      active: true,
      propertyType: 'house',
      postalCodes: '',
      minPrice: null,
      maxPrice: null,
      minBedroomCount: null,
    };
  }

  edit(search: ImmowebSearch): void {
    this.draftFromList = this.modalOpen;
    this.modalOpen = true;
    this.draftError = null;
    this.draft = { ...search, postalCodes: search.postalCodes.join(', ') };
  }

  cancelEdit(): void {
    if (this.draftFromList) this.draft = null;
    else this.closeModal();
  }

  remove(search: ImmowebSearch): void {
    if (!confirm(`Supprimer la recherche "${search.name}" ?`)) return;
    this.searchesService.remove(search.id);
  }

  saveDraft(): void {
    if (!this.draft) return;
    const postalCodes = this.parsePostalCodes(this.draft.postalCodes);
    const { minPrice, maxPrice } = this.draft;

    this.draftError = !this.draft.name.trim()
      ? 'Donne un nom à cette recherche.'
      : postalCodes.length === 0 || postalCodes.some((code) => !/^\d{4}$/.test(code))
        ? 'Indique au moins un code postal (4 chiffres, séparés par des virgules).'
        : minPrice !== null && maxPrice !== null && minPrice > maxPrice
          ? 'Le prix minimum dépasse le prix maximum.'
          : null;
    if (this.draftError) return;

    this.searchesService.save({ ...this.draft, name: this.draft.name.trim(), postalCodes });
    this.cancelEdit();
  }

  hasPostalCode(code: string): boolean {
    return !!this.draft && this.parsePostalCodes(this.draft.postalCodes).includes(code);
  }

  togglePostalCode(code: string): void {
    if (!this.draft) return;
    const codes = this.parsePostalCodes(this.draft.postalCodes);
    const next = codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code].sort();
    this.draft.postalCodes = next.join(', ');
  }

  private parsePostalCodes(raw: string): string[] {
    return [...new Set(raw.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))];
  }
}
