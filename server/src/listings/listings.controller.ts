import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { parseImmowebSearches } from './immoweb-search.model';
import type { ListingStatus } from './listing.model';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) { }

  @Post('sync')
  sync(@Body() body: unknown) {
    return this.listingsService.sync(parseImmowebSearches(body));
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
      toVisit?: boolean;
      ownerNote?: string | null;
    },
  ) {
    return this.listingsService.update(immowebId, body);
  }

  @Post('unmerge')
  unmerge(@Body() body: { immowebId: number }) {
    return this.listingsService.unmerge(body.immowebId);
  }

  @Post('merge')
  merge(@Body() body: { keepImmowebId: number; mergeImmowebId: number }) {
    return this.listingsService.merge(body.keepImmowebId, body.mergeImmowebId);
  }
}
