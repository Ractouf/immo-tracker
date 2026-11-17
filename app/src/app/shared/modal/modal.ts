import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
})
export class Modal {
  @Input({ required: true }) title!: string;
  @Output() close = new EventEmitter<void>();
}
