import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'empty'
})
export class EmptyPipe implements PipeTransform {
  constructor() { }

  transform(value: any) {

    return value == undefined || value == null || value == '' ? '-' : value;
  }

}