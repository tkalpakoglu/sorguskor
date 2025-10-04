import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { RegisterDto, LoginDto, RefreshDto } from './dto';

@ApiTags('auth')
@ApiBearerAuth('bearer')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Güvenli cookie opsiyonları (ortak) */
  private cookieOpts(path = '/api/auth') {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      path,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    } as const;
  }

  /** CSRF cookie opsiyonları (HttpOnly değil) */
  private csrfCookieOpts(path = '/') {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      path,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    } as const;
  }

  /** CSRF kontrolü: header ve cookie eşleşmeli */
  private assertCsrf(req: Request) {
    const header = req.headers['x-csrf-token'];
    const cookie = (req as any).cookies?.['csrf_token'];
    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException('CSRF token mismatch');
    }
  }

  // 60 sn’de en fazla 10 register
  @Throttle({ register: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, refresh_token } = await this.auth.register(dto.email, dto.password);

    // Refresh cookie (HttpOnly)
    res.cookie('refresh_token', refresh_token, this.cookieOpts('/api/auth'));

    // CSRF cookie (HttpOnly değil) + header’a da koy (SPA kolay alsın)
    const csrf = randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrf, this.csrfCookieOpts('/'));
    res.setHeader('x-csrf-token', csrf);

    return { access_token };
  }

  // 60 sn’de en fazla 5 login
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, refresh_token } = await this.auth.login(dto.email, dto.password);

    // Refresh cookie (HttpOnly)
    res.cookie('refresh_token', refresh_token, this.cookieOpts('/api/auth'));

    // CSRF cookie + header
    const csrf = randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrf, this.csrfCookieOpts('/'));
    res.setHeader('x-csrf-token', csrf);

    return { access_token };
  }

  // 60 sn’de en fazla 20 refresh
  @Throttle({ refresh: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'CSRF koruması için zorunlu' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [], // body zorunlu değil (cookie fallback)
      properties: { refresh_token: { type: 'string' } },
    },
  })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // CSRF doğrula
    this.assertCsrf(req);

    // Body yoksa cookie’den al
    const tokenFromBody = dto.refresh_token;
    const tokenFromCookie = (req as any).cookies?.['refresh_token'];
    const tokenToUse = tokenFromBody ?? tokenFromCookie;

    const { access_token, refresh_token } = await this.auth.refreshByToken(tokenToUse);

    // Rotasyon sonrası yeni refresh’i cookie’ye yaz
    res.cookie('refresh_token', refresh_token, this.cookieOpts('/api/auth'));

    return { access_token };
  }

  // Logout: default throttling
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'CSRF koruması için zorunlu' })
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    // CSRF doğrula
    this.assertCsrf(req);

    await this.auth.logout(req.user.userId);
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.clearCookie('csrf_token', { path: '/' });
    return { ok: true };
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { userId: req.user.userId, email: req.user.email };
  }
}
