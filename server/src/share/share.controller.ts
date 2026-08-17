import { Body, Controller, Get, Header, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FeedbackSentiment } from '../listings/listing.model';
import { ShareService } from './share.service';

const PAGE_PATH = join(__dirname, 'public', 'index.html');

@Controller()
export class ShareController {
  constructor(private readonly shareService: ShareService) { }

  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async page(@Param('token') token: string): Promise<string> {
    const html = await fs.readFile(PAGE_PATH, 'utf-8');
    return html.replace('__TOKEN__', token);
  }

  @Get(':token/listings')
  listings(@Param('token') token: string) {
    return this.shareService.getPublicListings(token);
  }

  @Patch(':token/listings/:immowebId')
  updateFeedback(
    @Param('token') token: string,
    @Param('immowebId', ParseIntPipe) immowebId: number,
    @Body() body: { feedbackSentiment?: FeedbackSentiment; feedbackNote?: string | null },
  ) {
    return this.shareService.submitFeedback(token, immowebId, body);
  }
}
