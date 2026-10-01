import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dropdown } from '../dropdown/dropdown';

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
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  sizeItems: { id: number; value: string }[] = [48, 102, 150].map((size) => ({ id: size, value: `${size} par page` }));

  get lastPage(): number {
    return Math.max(0, Math.ceil(this.total / this.pageSize) - 1);
  }

  get rangeLabel(): string {
    const format = (n: number) => new Intl.NumberFormat('fr-BE').format(n);
    const start = this.page * this.pageSize + 1;
    const end = Math.min((this.page + 1) * this.pageSize, this.total);
    return `${format(start)}–${format(end)} sur ${format(this.total)}`;
  }

  goTo(page: number): void {
    if (page < 0 || page > this.lastPage || page === this.page) return;
    this.pageChange.emit(page);
  }
}
