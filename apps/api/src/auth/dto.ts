// apps/api/src/auth/dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email is invalid' })
  email!: string;

  @IsString({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 chars' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email is invalid' })
  email!: string;

  @IsString({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 chars' })
  password!: string;
}

export class RefreshDto {
  @IsString({ message: 'refresh_token is required' })
  refresh_token!: string;
}
