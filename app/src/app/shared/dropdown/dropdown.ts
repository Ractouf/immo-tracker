import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Badge } from '../badge/badge';
import { ProfilePicture } from "../profile-picture/profile-picture";

@Component({
  selector: 'app-dropdown',
  imports: [CommonModule, FormsModule, Badge, ProfilePicture],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Dropdown),
      multi: true
    }
  ]
})
export class Dropdown implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {

  @ViewChild('dpd') dpd!: ElementRef;
  @ViewChild('list', { read: ElementRef }) list!: ElementRef;
  @ViewChild('filter') filter!: ElementRef;

  @Input() items: any[] = [];
  @Input() attributes?: string[];
  @Input() placeholder?: string;
  @Input() multi: boolean = false;
  @Input() disabled: boolean = false;
  @Input() returnObjects: boolean = false;
  @Input() badge: boolean = false;
  @Input() colorFn?: (item: any) => string;
  @Input() disabledFn?: (item: any) => string | null | undefined;
  @Output() change = new EventEmitter<any>();
  @Output() addItem = new EventEmitter<string>();
  @Output() input = new EventEmitter<string>();

  selectedIds: number[] = [];
  selectedItems: any[] = [];
  unselectedItems: any[] = [];
  filteredItems: any[] = [];
  pagedItems: any[] = [];
  searchBy: string = '';

  offsetTop: number | undefined;
  page = 30;
  limit = this.page;
  isExpanded = false;
  shouldDisplayUpwards = false;
  isAddingItem = false;

  constructor(
    private elementRef: ElementRef
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Check if the click was outside the dropdown component
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isExpanded = false;
    }
  }

  ngOnInit() {
    window.addEventListener('scroll', this.scroll, true);
    window.addEventListener('resize', this.scroll, true);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scroll, true);
    window.removeEventListener('resize', this.scroll, true);
  }

  ngOnChanges() {
    this.selectItems();
  }

  scroll = () => {
    this.computeListOffset();
  };

  writeValue(value: any) {
    if (value !== null) {
      if (Array.isArray(value)) {
        this.selectedIds = this.returnObjects ? value.map(v => this.getItemIdentifier(v)) : value;
        this.selectedItems = this.returnObjects ? this.items.filter(item => value.includes(this.getItemIdentifier(item))) : [];
      } else {
        this.selectedIds = [this.returnObjects ? this.getItemIdentifier(value) : value];
        this.selectedItems = this.returnObjects ? [this.items.find(item => this.returnObjects ? this.getItemIdentifier(value) : value === this.getItemIdentifier(item))] : [];
      }
    } else {
      this.selectedIds = [];
      this.selectedItems = [];
    }
    this.selectItems();
  }

  _toggleList() {
    this.isExpanded = this.disabled ? false : !this.isExpanded;
    this.filterItems();
    this.focusFilter();
  }

  toggleList() {
    this.isExpanded = this.disabled ? false : !this.isExpanded;
    this.searchBy = '';
    this.filterItems();

    this.focusFilter();
  }

  focusFilter() {
    if (this.isExpanded) {
      setTimeout(() => {
        this.filter?.nativeElement?.focus();
      }, 0);
    }
  }

  selectItems() {
    if (this.items) {
      this.selectedIds = this.selectedIds ? this.selectedIds : [];
      this.selectedItems = this.items.filter(item =>
        this.selectedIds.includes(this.getItemIdentifier(item))
      );
      this.unselectedItems = this.items.filter(item =>
        !this.selectedIds.includes(this.getItemIdentifier(item))
      );
      this.filterItems();
    }
  }

  selectItem(item: any) {
    this.searchBy = '';
    const itemId = this.getItemIdentifier(item);
    if (this.multi) {
      this.selectedIds.push(itemId);
      if (this.returnObjects) {
        this.selectedItems.push(item);
      }
    } else {
      this.selectedIds = [itemId];
      this.selectedItems = this.returnObjects ? [item] : [];
    }

    this.propagateChange(this.returnObjects ? (this.multi ? this.selectedItems : this.selectedItems[0]) : (this.multi ? this.selectedIds : this.selectedIds[0]));
    this.change.emit(this.returnObjects ? this.selectedItems : this.selectedIds);
    this.selectItems();
  }

  unselectItem(item: any) {
    const itemId = this.getItemIdentifier(item);
    if (this.multi) {
      const index = this.selectedIds.indexOf(itemId);
      if (index > -1) {
        this.selectedIds.splice(index, 1);
        if (this.returnObjects) {
          this.selectedItems.splice(index, 1);
        }
        this.propagateChange(this.returnObjects ? this.selectedItems : this.selectedIds);
        this.change.emit(this.returnObjects ? this.selectedItems : this.selectedIds);
        this.selectItems();
      }
    }
  }

  filterItems() {
    const filter = this.searchBy ? this.formatItem(this.searchBy).trim() : '';

    if (filter !== '') {
      this.filteredItems = this.unselectedItems.filter(item => {
        // If dealing with strings directly
        if (!this.attributes || this.attributes.length === 0) {
          return this.formatItem(String(item)).includes(filter);
        } else {
          // If dealing with objects and filtering based on attributes
          return this.attributes.some(attribute => {
            const value = this.getNestedProperty(item, attribute);
            return value !== undefined && this.formatItem(String(value)).includes(filter);
          });
        }
      });
    } else {
      this.filteredItems = this.unselectedItems;
    }

    this.pageItems(false);
  }

  onInputKeydown(event: KeyboardEvent) {
    event.stopPropagation();

    if (event.key === 'Enter' && this.unselectedItems && this.unselectedItems.length > 0) {
      event.preventDefault();

      const filter = this.searchBy ? this.formatItem(this.searchBy).trim() : '';
      const filteredItems = this.unselectedItems.filter(item => {
        if (!this.attributes || this.attributes.length === 0) {
          return this.formatItem(String(item)) === filter;
        } else {
          return this.attributes.some(attribute => {
            const value = this.getNestedProperty(item, attribute);
            return value !== undefined && this.formatItem(String(value)) === filter;
          });
        }
      });

      if (filteredItems?.length > 0) {
        this.selectItem(filteredItems[0]);
      } else {
        this.addItem.emit(this.searchBy);
        this.searchBy = '';
        this.isAddingItem = true;
      }

      if (!this.multi) {
        this.isExpanded = false;
      }
    }
  }

  pageItems(increase: boolean) {
    this.limit = increase ? this.page + this.limit : this.limit;
    this.pagedItems = this.filteredItems.slice(0, this.limit);
    setTimeout(() => {
      this.computeListOffset();
    });
  }

  computeListOffset() {
    const dropdownRect = this.dpd.nativeElement.getBoundingClientRect();
    const listHeight = this.list.nativeElement.offsetHeight;
    const spaceBelow = window.innerHeight - dropdownRect.bottom;
    this.offsetTop = dropdownRect.bottom;

    if (spaceBelow < listHeight) {
      this.offsetTop = dropdownRect.top - listHeight;
      this.shouldDisplayUpwards = true;
    } else {
      this.shouldDisplayUpwards = false;
    }
  }

  formatItem(item: any) {
    return item.toLowerCase().replace(/[àâ]/g, 'a').replace(/[éèê]/g, 'e');
  }

  /**
   * Gets a nested property value from an object using dot notation
   * @param obj The object to get the property from
   * @param path The dot-separated path to the property (e.g., 'address.addressLine1')
   * @returns The value of the nested property or undefined if not found
   */
  getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  getItemIdentifier(item: any): any {
    return this.returnObjects ? item : (item && this.attributes && this.attributes.length > 0 ? item.id : item);
  }

  isUrl(value: string): boolean {
    const urlPattern = new RegExp('^(https?:\\/\\/)?' +
      '((([a-z0-9\\-]+\\.)+[a-z]{2,})|localhost|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})' +
      '(\\:\\d+)?(\\/[^\\s]*)?$', 'i');
    return urlPattern.test(value);
  }

  getItemColor(item: any): string {
    if (this.colorFn) {
      return this.colorFn(item);
    }
    return item?.color || 'gray';
  }

  getItemDisabledReason(item: any): string | null {
    return this.disabledFn ? (this.disabledFn(item) || null) : null;
  }

  isItemDisabled(item: any): boolean {
    return !!this.getItemDisabledReason(item);
  }

  onItemClick(item: any, event: Event): void {
    event.stopPropagation();
    if (this.isItemDisabled(item)) return;
    this.isExpanded = this.multi ? true : false;
    this.selectItem(item);
    this.focusFilter();
  }

  propagateChange = (_: any) => { };

  registerOnChange(fn: any) {
    this.propagateChange = fn;
  }

  registerOnTouched() { }

}
