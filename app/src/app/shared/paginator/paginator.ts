import { formatNumber } from '@angular/common';
import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dropdown } from '../dropdown/dropdown';
import { isPlainLeftClick } from '../utils/plain-click';

@Component({
  selector: 'app-paginator',
  imports: [FormsModule, Dropdown],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
})
export class Paginator {
  @Input({ required: true }) total = 0;
  @Input({ required: true }) page = 0;
  @Input({ required: true }) pageSize = 48;
  @Input() set pageSizeOptions(options: number[]) {
    this.sizeItems = options.map((size) => ({ id: size, value: `${size} par page` }));
  }
  @Input() compact = false;
  @Input() pageUrl?: (page: number) => string;
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  sizeItems: { id: number; value: string }[] = [48, 102, 150].map((size) => ({ id: size, value: `${size} par page` }));

  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  onPageClick(event: MouseEvent, page: number): void {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    this.goTo(page);
  }

  goTo(page: number): void {
    if (page < 0 || page > this.lastPage || page === this.page) return;
    this.pageChange.emit(page);
  }

  get lastPage(): number {
    return Math.max(0, Math.ceil(this.total / this.pageSize) - 1);
  }

  get rangeLabel(): string {
    const format = (n: number) => formatNumber(n, this.locale);
    const start = this.page * this.pageSize + 1;
    const end = Math.min((this.page + 1) * this.pageSize, this.total);
    return `${format(start)}–${format(end)} sur ${format(this.total)}`;
  }
}
