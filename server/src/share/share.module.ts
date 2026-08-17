import { Module } from '@nestjs/common';
import { ListingsStore } from '../listings/listings.store';
import { ShareTokenStore } from '../share-token/share-token.store';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

@Module({
  controllers: [ShareController],
  providers: [ShareService, ListingsStore, ShareTokenStore],
})
export class ShareModule { }
