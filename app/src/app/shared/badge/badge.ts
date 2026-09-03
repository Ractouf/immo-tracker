import { Component, Input } from '@angular/core';
import { BadgeColor } from './badge.enum';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.scss'
})
export class Badge {

  @Input() color!: BadgeColor | string;
  @Input() text!: string;
  @Input() showDot?: boolean = false;
  @Input() icon?: string;

}
