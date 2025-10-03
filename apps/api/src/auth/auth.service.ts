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

  // ---- helpers -------------------------------------------------------------
  private signAccess(userId: string, email: string) {
    // payload -> { sub, email }
    return this.jwt.sign(
      { sub: userId, email },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'devaccess',
        expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
      },
    );
  }

  private signRefresh(userId: string) {
    // payload -> { sub }
    return this.jwt.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
        expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
      },
    );
  }

  // ---- flows ---------------------------------------------------------------
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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const access_token = this.signAccess(user.id, user.email);
    const refresh_token = this.signRefresh(user.id);

    const refreshHash = await bcrypt.hash(refresh_token, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash },
    });

    return { access_token, refresh_token };
  }

  /**
   * refresh(userId, token):
   * 1) token verify + sub == userId
   * 2) DB’deki hash ile karşılaştır
   * 3) yeni access üret
   */
  async refresh(userId: string, refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
        clockTolerance: 5,
      });
      if (payload.sub !== userId) throw new UnauthorizedException();
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshHash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(refreshToken, user.refreshHash);
    if (!ok) throw new UnauthorizedException();

    const access_token = this.signAccess(user.id, user.email);
    return { access_token };
  }

  /**
   * Body’den gelen refresh_token ile doğrudan yenileme.
   * Ek olarak refresh rotate yapıyoruz (yeni refresh üretip hash’liyoruz).
   */
  async refreshByToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('refresh_token is required');
    }

    // 1) verify + sub al
    const { sub } = this.jwt.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'devrefresh',
      clockTolerance: 5,
    }) as { sub: string };

    // 2) DB hash karşılaştır
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user?.refreshHash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(refreshToken, user.refreshHash);
    if (!ok) {
      // reuse şüphesi -> refresh’i sıfırla
      await this.prisma.user.update({
        where: { id: sub },
        data: { refreshHash: null },
      });
      throw new UnauthorizedException();
    }

    // 3) yeni access + yeni refresh (rotate)
    const access_token = this.signAccess(user.id, user.email);
    const newRefresh = this.signRefresh(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash: await bcrypt.hash(newRefresh, 10) },
    });

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
