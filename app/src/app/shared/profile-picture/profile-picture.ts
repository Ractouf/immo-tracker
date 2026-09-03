import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-profile-picture',
  imports: [],
  templateUrl: './profile-picture.html',
  styleUrl: './profile-picture.scss'
})
export class ProfilePicture {
  @Input() imageUrl?: string;
  @Input() fullName?: string;
  @Input() size: string = '64px';

  @Output() click = new EventEmitter();

  get placeholder(): string {
    if (this.fullName) {
      const name = this.fullName.replace(/\s/g, '+');
      return `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff&rounded=true`;
    } else {
      return '';
    }
  }
}
