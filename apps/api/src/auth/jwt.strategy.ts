import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'devaccess',
    });
  }

  // login/register sırasında { sub, email } ile imzalıyoruz → burada sub'u userId olarak döndür.
  validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
