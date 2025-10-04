// apps/api/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // === helpers ===============================================================
  private signAccess(userId: string, email: string) {
    return this.jwt.sign(
      { sub: userId, email },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'devaccess',
        expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
      },
    );
  }

  private signRefresh(userId: string) {
    return this.jwt.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
        expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
      },
    );
  }

  // === flows ================================================================
  async register(email: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    const access_token = this.signAccess(user.id, user.email);
    const refresh_token = this.signRefresh(user.id);

    const refreshHash = await bcrypt.hash(refresh_token, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash },
    });

    return { access_token, refresh_token };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        failedLoginCount: true,
        lastFailedLoginAt: true,
        lockedUntil: true,
      }
    });
    
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 🔒 1) Zaten kilitli mi?
    const now = new Date();
    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      const remainingMs = new Date(user.lockedUntil).getTime() - now.getTime();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new ConflictException(
        `Too many failed attempts. Try again in ~${remainingMin} minute(s).`,
      );
    }

    // 2) Şifre kontrolü
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const MAX_FAILS = Number(process.env.AUTH_MAX_FAILS ?? 5);
      const LOCK_MIN = Number(process.env.AUTH_LOCK_MINUTES ?? 15);
      const WINDOW_MIN = 10;

      let nextFails = (user.failedLoginCount ?? 0) + 1;
      
      // Eğer son hata 10 dakikadan önceyse, sayacı sıfırla
      if (user.lastFailedLoginAt) {
        const lastFailTime = new Date(user.lastFailedLoginAt).getTime();
        if (now.getTime() - lastFailTime > WINDOW_MIN * 60000) {
          nextFails = 1;
        }
      }

      if (nextFails >= MAX_FAILS) {
        // Eşiğe ulaşıldı → kilitle ve 409 döndür
        const lockUntil = new Date(now.getTime() + LOCK_MIN * 60000);
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lastFailedLoginAt: now,
            lockedUntil: lockUntil,
          },
        });
        throw new ConflictException(
          `Too many failed attempts. Account locked for ~${LOCK_MIN} minute(s).`,
        );
      }

      // Eşiğe daha var → sayaç artır + 401
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextFails,
          lastFailedLoginAt: now,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3) Başarılı giriş → sayaçları sıfırla, kilidi kaldır
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      },
    });

    const access_token = this.signAccess(user.id, user.email);
    const refresh_token = this.signRefresh(user.id);

    const refreshHash = await bcrypt.hash(refresh_token, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash },
    });

    return { access_token, refresh_token };
  }

  async refresh(userId: string, refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
      });
      if (payload.sub !== userId) throw new UnauthorizedException();
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, refreshHash: true },
    });
    if (!user?.refreshHash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(refreshToken, user.refreshHash);
    if (!ok) throw new UnauthorizedException();

    const access_token = this.signAccess(user.id, user.email);
    return { access_token };
  }

  async refreshByToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('refresh_token is required');
    }

    const { sub } = this.jwt.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
    }) as { sub: string };

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, refreshHash: true },
    });
    if (!user?.refreshHash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(refreshToken, user.refreshHash);
    if (!ok) {
      await this.prisma.user.update({
        where: { id: sub },
        data: { refreshHash: null },
      });
      throw new UnauthorizedException();
    }

    // refresh rotasyonu
    const newRefresh = this.signRefresh(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash: await bcrypt.hash(newRefresh, 10) },
    });

    const access_token = this.signAccess(user.id, user.email);
    return { access_token, refresh_token: newRefresh };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHash: null },
    });
    return { ok: true };
  }
}