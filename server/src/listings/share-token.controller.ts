import { Controller, Get, Post } from '@nestjs/common';
import { ShareTokenStore } from '../share-token/share-token.store';

@Controller('share-token')
export class ShareTokenController {
  constructor(private readonly shareTokenStore: ShareTokenStore) { }

  @Get()
  async get() {
    return { token: await this.shareTokenStore.getOrCreate() };
  }

  @Post('regenerate')
  async regenerate() {
    return { token: await this.shareTokenStore.regenerate() };
  }
}
