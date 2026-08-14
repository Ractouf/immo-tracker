import { Component } from '@angular/core';
import { Listings } from './listings/listings';

@Component({
  selector: 'app-root',
  imports: [Listings],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App { }
