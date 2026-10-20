import { NestFactory } from '@nestjs/core';
import { ListingsModule } from './listings/listings.module';

async function bootstrap() {
  try {
    process.loadEnvFile('../.env');
  } catch {
  }
  const app = await NestFactory.create(ListingsModule);
  app.enableCors({ origin: 'http://localhost:5500' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
