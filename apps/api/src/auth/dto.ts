// apps/api/src/auth/dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta giriniz' })
  email!: string;

  @ApiProperty({
    example: 'Abc12345!',
    description:
      'En az 8 karakter; harf ve rakam içermeli (opsiyonel sembol önerilir).',
  })
  @IsString({ message: 'Şifre zorunludur' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @MaxLength(64, { message: 'Şifre en fazla 64 karakter olmalıdır' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\S]{8,}$/, {
    message:
      'Şifre en az bir harf ve bir rakam içermelidir (sembol eklemeniz önerilir)',
  })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta giriniz' })
  email!: string;

  @ApiProperty({ example: 'Abc12345!' })
  @IsString({ message: 'Şifre zorunludur' })
  @IsNotEmpty({ message: 'Şifre boş olamaz' })
  password!: string;
}

export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh JWT',
  })
  @IsOptional()
  @IsString({ message: 'refresh_token zorunludur' })
  @IsNotEmpty({ message: 'refresh_token boş olamaz' })
  refresh_token!: string;
}
