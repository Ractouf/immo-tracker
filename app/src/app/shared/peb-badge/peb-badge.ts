import { Component, Input } from '@angular/core';

export const PEB_ORDER = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

const PEB_COLORS: Record<string, string> = {
  A: 'bg-green-700',
  B: 'bg-green-500',
  C: 'bg-lime-500',
  D: 'bg-yellow-400',
  E: 'bg-amber-500',
  F: 'bg-orange-600',
  G: 'bg-red-600',
};

@Component({
  selector: 'app-peb-badge',
  template: `<span class="inline-block rounded-l pl-1.5 pr-3 py-0.5 text-xs font-bold text-white" [class]="color" title="PEB">{{ peb }}</span>`,
  styles: `span { clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%); }`,
})
export class PebBadge {
  @Input({ required: true }) peb!: string;

  get color(): string {
    return PEB_COLORS[this.peb.charAt(0)] ?? 'bg-gray-500';
  }
}
