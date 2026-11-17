import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [],
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Toggle),
      multi: true,
    },
  ],
})
export class Toggle implements ControlValueAccessor {
  @Input() label = '';
  @Input() id = 'toggle';
  @Input() value = false;

  propagateChange = (_: boolean) => {};

  toggleValue() {
    this.value = !this.value;
    this.propagateChange(this.value);
  }

  writeValue(value: boolean) {
    this.value = value;
  }

  registerOnChange(fn: (value: boolean) => void) {
    this.propagateChange = fn;
  }

  registerOnTouched() {}
}
