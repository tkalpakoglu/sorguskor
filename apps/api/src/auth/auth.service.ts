// apps/api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';                    // <--- EKLE
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service'; // senin import yolun zaten var

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);   // <--- HASH
    const user = await this.prisma.user.create({
      data: { email, passwordHash: hash },          // <--- passwordHash alanı
    });

    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash); // <--- DOĞRULAMA
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }
}
