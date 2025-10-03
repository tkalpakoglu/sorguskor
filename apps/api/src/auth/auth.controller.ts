// apps/api/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('auth')
@ApiBearerAuth('bearer')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 1) REGISTER
  @Throttle({ default: { limit: 10, ttl: 60 } }) // 1 dk’da 10 deneme
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.auth.register(
      dto.email,
      dto.password,
    );

    // refresh token’ı httpOnly cookie olarak yaz
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      path: '/api/auth',
    });

    return { access_token };
  }

  // 2) LOGIN
  @Throttle({ default: { limit: 5, ttl: 60 } }) // 1 dk’da 5 deneme
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.auth.login(
      dto.email,
      dto.password,
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return { access_token };
  }

  // 3) REFRESH (body ile; rotate + cookie günceller)
  @Post('refresh')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: { refresh_token: { type: 'string' } },
    },
  })
  async refresh(
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // refreshByToken: verify + DB hash kontrol + ROTATE
    const { access_token, refresh_token } = await this.auth.refreshByToken(
      dto.refresh_token,
    );

    // yeni refresh’i cookie’ye bas (rotate)
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return { access_token };
  }

  // 4) LOGOUT (access token zorunlu)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user.userId); // DB’de refresh’i sıfırla
    res.clearCookie('refresh_token', { path: '/api/auth' }); // cookie temizle
    return { ok: true };
  }

  // 5) ME (örnek korumalı endpoint)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { userId: req.user.userId, email: req.user.email };
  }
}
