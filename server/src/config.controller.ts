import { Controller, Get } from '@nestjs/common';

@Controller('config')
export class ConfigController {
  @Get()
  get() {
    return { cartoApiKey: process.env.CARTO_API_KEY ?? null };
  }
}
