import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, Length } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsOptional()
  @IsEnum(['particulier', 'pro'])
  typeCompte?: 'particulier' | 'pro';
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class VerifyAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResendCodeDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}