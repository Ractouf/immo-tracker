import { NestFactory } from '@nestjs/core';
import { ListingsModule } from './listings/listings.module';
import { ShareModule } from './share/share.module';

async function bootstrap() {
  const app = await NestFactory.create(ListingsModule);
  app.enableCors({ origin: 'http://localhost:5500' });
  await app.listen(process.env.PORT ?? 3000);

  const shareApp = await NestFactory.create(ShareModule);
  await shareApp.listen(process.env.SHARE_PORT ?? 3001);
}
bootstrap();
