// apps/api/src/prisma/prisma.service.ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma tipleri bu event adını çok kısıtlı tuttuğu için 'as any' ile işaretliyoruz
    this.$on('beforeExit' as any, async () => {
      await app.close();
    });
  }
}
