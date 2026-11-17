import { formatNumber } from '@angular/common';
import { Directive, ElementRef, HostListener, Inject, LOCALE_ID, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appThousandSeparator]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThousandSeparatorDirective),
      multi: true,
    },
  ],
})
export class ThousandSeparatorDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly elementRef: ElementRef<HTMLInputElement>,
    @Inject(LOCALE_ID) private readonly locale: string,
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const cleaned = this.clean((event.target as HTMLInputElement).value);
    const value = this.parse(cleaned);

    this.elementRef.nativeElement.value = cleaned === '' || cleaned === '-' || cleaned.endsWith(',') ? cleaned : this.format(value);
    this.onChange(value);
  }

  @HostListener('blur')
  onBlur(): void {
    this.writeValue(this.parse(this.clean(this.elementRef.nativeElement.value)));
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.elementRef.nativeElement.value = this.format(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private clean(raw: string): string {
    return raw.replace(/[^\d,-]/g, '');
  }

  private parse(cleaned: string): number | null {
    if (cleaned === '' || cleaned === '-') return null;
    const value = Number(cleaned.replace(',', '.'));
    return isNaN(value) ? null : value;
  }

  private format(value: number | null): string {
    if (value == null || isNaN(value)) return '';
    return formatNumber(value, this.locale);
  }
}
