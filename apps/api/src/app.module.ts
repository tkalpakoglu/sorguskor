import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [join(process.cwd(), 'apps', 'api', '.env')], // monorepo için sabitle
});

@Module({
  
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
