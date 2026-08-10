import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // crossOriginResourcePolicy off: helmet's default same-origin value would stop
  // the marketing site loading an upload when the two are on different origins
  // in production. Everything else helmet sets stays on.
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.setGlobalPrefix('api');

  // Uploads are served from a dedicated route, and this is the ONLY place the
  // upload directory is named outside the storage driver. index:false so the
  // directory is not browsable; the URLs are unguessable UUIDs, and a listing
  // would hand out every one of them.
  app.useStaticAssets(resolve(process.env.UPLOAD_DIR ?? 'uploads'), {
    prefix: '/api/uploads/',
    index: false,
    maxAge: '30d',
    immutable: true,
  });

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
