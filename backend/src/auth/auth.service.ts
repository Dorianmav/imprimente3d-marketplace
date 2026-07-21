import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { StringValue } from 'ms';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ForgotPasswordDto, LoginDto, ResendCodeDto, ResetPasswordDto, SignupDto, VerifyAccountDto } from './dto/auth.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private codeExpiry(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });
    if (existingUser) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(signupDto.password, 12);
    const verificationCode = this.generateCode();

    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        passwordHash,
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: signupDto.typeCompte ?? 'particulier',
        verificationCode,
        verificationCodeExpiry: this.codeExpiry(),
      },
    });

    await this.mailService.sendVerificationCode(user.email, verificationCode);

    return {
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
      email: user.email,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      const verificationCode = this.generateCode();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationCode, verificationCodeExpiry: this.codeExpiry() },
      });
      await this.mailService.sendVerificationCode(user.email, verificationCode);

      return {
        requiresVerification: true,
        message: 'Compte non vérifié. Nouveau code envoyé par email.',
        email: user.email,
      };
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        typeCompte: user.typeCompte,
      },
      ...tokens,
    };
  }

  async verifyAccount(dto: VerifyAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isVerified) throw new ConflictException('Compte déjà vérifié');

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      throw new UnauthorizedException('Aucun code en attente');
    }
    if (user.verificationCodeExpiry < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }
    if (user.verificationCode !== dto.code) {
      throw new UnauthorizedException('Code invalide');
    }

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    const tokens = await this.generateTokens(verifiedUser);
    await this.updateRefreshToken(verifiedUser.id, tokens.refreshToken);

    return {
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        nom: verifiedUser.nom,
        prenom: verifiedUser.prenom,
        typeCompte: verifiedUser.typeCompte,
      },
      ...tokens,
    };
  }

  async resendCode(dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return { message: 'Si ce compte existe, un code a été envoyé.' };
    if (user.isVerified) throw new ConflictException('Compte déjà vérifié');

    const verificationCode = this.generateCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode, verificationCodeExpiry: this.codeExpiry() },
    });
    await this.mailService.sendVerificationCode(user.email, verificationCode);

    return { message: 'Code renvoyé par email.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return { message: 'Si ce compte existe, un code a été envoyé.' };

    const resetCode = this.generateCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry: this.codeExpiry() },
    });
    await this.mailService.sendPasswordResetCode(user.email, resetCode);

    return { message: 'Si ce compte existe, un code a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid request');

    if (!user.resetCode || !user.resetCodeExpiry) {
      throw new UnauthorizedException('Aucune demande en cours');
    }
    if (user.resetCodeExpiry < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }
    if (user.resetCode !== dto.code) {
      throw new UnauthorizedException('Code invalide');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetCode: null,
        resetCodeExpiry: null,
        refreshToken: null,
      },
    });

    return { message: 'Mot de passe réinitialisé.' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokensFromToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (!payload?.sub) {
        throw new UnauthorizedException('Access denied');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Access denied');
      }

      return this.refreshTokens(payload.sub, refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Access denied');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Access denied');
    }

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      typeCompte: user.typeCompte,
    };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRATION',
          '15m',
        ) as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
