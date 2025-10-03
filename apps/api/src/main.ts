// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpErrorFilter } from './common/http-exception.filter';
import { HideSensitiveMiddleware } from './prisma/hide-sensitive.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Tüm endpointler /api ile başlasın
  app.setGlobalPrefix('api');

  // Hassas alanları (passwordHash, refreshHash) response’lardan temizleyen middleware
  (app as any).use(new HideSensitiveMiddleware().use);

  // Güvenlik & middleware
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpErrorFilter());

  // CORS
  const ORIGIN = process.env.CLIENT_URL ?? 'http://localhost:3000';
  app.enableCors({ origin: ORIGIN, credentials: true });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Sorguskor API')
    .setDescription('Auth + Health endpointleri için OpenAPI dokümanı')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearer', // Swagger UI'da "Authorize" şema adı
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document, {
    jsonDocumentUrl: '/api/docs-json',
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
