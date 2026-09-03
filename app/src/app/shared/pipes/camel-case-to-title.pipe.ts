import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'camelCaseToTitle'
})
export class CamelCaseToTitlePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    if (value === value.toUpperCase()) return value;
    return value
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
}