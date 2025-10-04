// apps/api/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ✔ Access token’ı doğrulamak için "JWT_ACCESS_SECRET" kullanıyoruz
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'devaccess',
      ignoreExpiration: false,
    });
  }

  // access token payload’ı: { sub, email }
  async validate(payload: { sub: string; email: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
