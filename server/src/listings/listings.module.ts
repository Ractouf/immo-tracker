import { Module } from '@nestjs/common';
import { ImmowebService } from './immoweb.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsStore } from './listings.store';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, ListingsStore, ImmowebService],
})
export class ListingsModule { }
