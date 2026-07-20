import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

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
