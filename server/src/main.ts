import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');

  // whitelist strips unknown keys; forbidNonWhitelisted rejects them loudly, so
  // a client cannot smuggle a field the DTO never declared (e.g. `status`).
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Explicit allowlist, never "*" - this API issues credentials.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  await app.listen(Number(process.env.PORT ?? 3001));
}
bootstrap();
