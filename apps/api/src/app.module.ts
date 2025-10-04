import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envSchema } from './env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';
import { LoggerModule } from 'nestjs-pino';
import { JsonThrottlerGuard } from './common/guards/json-throttler.guard';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validationSchema: envSchema,
    }),

 LoggerModule.forRoot({
  pinoHttp: {
    // İstek kimliği: header varsa onu kullan, yoksa UUID üret
    genReqId: (req: any, res: any) => {
      const hdr = req.headers['x-request-id'];
      if (typeof hdr === 'string' && hdr.length > 0) return hdr;

      const id = randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },

    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,

    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
}),

    // ✅ DÜZELTİLDİ: TTL milisaniye cinsinden ve doğru syntax
    ThrottlerModule.forRoot([
      // global default (diğer endpointler) - 1 dakikada 100 istek
      { name: 'default', ttl: 60000, limit: 100 },
      // giriş denemeleri için düşük limit - 1 dakikada 5 istek
      { name: 'login', ttl: 60000, limit: 5 },
      // kayıt için orta seviye limit - 1 dakikada 10 istek
      { name: 'register', ttl: 60000, limit: 10 },
      // refresh token için limit - 1 dakikada 20 istek
      { name: 'refresh', ttl: 60000, limit: 20 },
    ]),

    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    // throttling'i global guard olarak etkinleştir//
    { provide: APP_GUARD, useClass: JsonThrottlerGuard },
  ],
})
export class AppModule {}