import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS — origins from env, comma-separated.
  const rawOrigins = process.env.CORS_ORIGINS || '';
  const corsOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  // WebSocket adapter (socket.io) — same HTTP port.
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger docs at /docs
  const config = new DocumentBuilder()
    .setTitle('Te Reparo Cloud API')
    .setDescription('API Cloud para Te Reparo Manager — sync multi-taller')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  logger.log(`Te Reparo Cloud API listening on :${port} (prefix /api, docs /docs)`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed', err);
  process.exit(1);
});
