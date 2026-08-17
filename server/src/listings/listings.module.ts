import { Module } from '@nestjs/common';
import { ShareTokenStore } from '../share-token/share-token.store';
import { ImmowebService } from './immoweb.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsStore } from './listings.store';
import { ShareTokenController } from './share-token.controller';

@Module({
  controllers: [ListingsController, ShareTokenController],
  providers: [ListingsService, ListingsStore, ImmowebService, ShareTokenStore],
})
export class ListingsModule { }
