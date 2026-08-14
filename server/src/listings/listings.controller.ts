import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { FeedbackSentiment, ListingStatus } from './listing.model';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) { }

  @Post('sync')
  sync() {
    return this.listingsService.sync();
  }

  @Get()
  findAll(@Query('status') status?: ListingStatus, @Query('removed') removed?: string) {
    if (removed === 'true') {
      return this.listingsService.findRemoved();
    }
    return this.listingsService.findByStatus(status);
  }

  @Patch(':immowebId')
  update(
    @Param('immowebId', ParseIntPipe) immowebId: number,
    @Body()
    body: {
      status?: ListingStatus;
      feedbackSentiment?: FeedbackSentiment;
      feedbackNote?: string | null;
    },
  ) {
    return this.listingsService.update(immowebId, body);
  }

  @Post('merge')
  merge(@Body() body: { keepImmowebId: number; mergeImmowebId: number }) {
    return this.listingsService.merge(body.keepImmowebId, body.mergeImmowebId);
  }
}
