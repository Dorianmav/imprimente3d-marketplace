import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  OAuthCallbackDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    typeCompte: string;
    emailVerifiedAt: Date | null;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // SIGNUP — CDC T-1.1
  // ============================================

  async signup(signupDto: SignupDto): Promise<AuthResult> {
    // Check for duplicate email → 409
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password with argon2id
    const passwordHash = await argon2.hash(signupDto.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        passwordHash,
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: signupDto.typeCompte ?? 'particulier',
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in dedicated table with family_id
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        typeCompte: user.typeCompte,
        emailVerifiedAt: user.emailVerifieAt,
      },
      ...tokens,
    };
  }

  // ============================================
  // LOGIN — CDC T-1.1
  // ============================================

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.passwordHash) {
      // Use same error for security (don't reveal if user exists)
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password with argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        typeCompte: user.typeCompte,
        emailVerifiedAt: user.emailVerifieAt,
      },
      ...tokens,
    };
  }

  // ============================================
  // REFRESH — CDC T-1.3 (rotatif, famille_id)
  // ============================================

  async refreshTokens(userId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Fetch the stored refresh token with user
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash: refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Check for reuse detection: if this token family has been used before
    // (meaning the old token was stolen and reused)
    const familyTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        familleId: storedToken.familleId,
      },
    });

    if (familyTokens.length > 1) {
      // Token reuse detected — revoke the entire family
      this.logger.warn(`Token reuse detected for user ${userId}, revoking family ${storedToken.familleId}`);
      await this.prisma.refreshToken.updateMany({
        where: { familleId: storedToken.familleId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Suspicious activity — all sessions revoked');
    }

    // Rotative: revoke current token, issue new ones
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokensForUser(userId);
    await this.storeRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke only this specific token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          tokenHash: refreshToken,
          revokedAt: null,
        },
      });
    } else {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  // ============================================
  // TOKEN HELPERS
  // ============================================

  private async generateTokens(user: { id: string; email: string }): Promise<AuthTokens> {
    return this.generateTokensForUser(user.id);
  }

  private async generateTokensForUser(userId: string): Promise<AuthTokens> {
    const payload = { sub: userId };
    const familleId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as StringValue,
      }),
      this.jwtService.signAsync({ ...payload, familleId }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    // Decode the token to get the famille_id
    const decoded = this.jwtService.decode<{ familleId: string }>(refreshToken);
    const familleId = decoded?.familleId || randomUUID();

    // Hash the token before storing
    const tokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.msFromValue(expiresIn));

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familleId,
        expiresAt,
      },
    });
  }

  private msFromValue(value: StringValue): number {
    // Simple conversion for common values
    if (typeof value === 'number') return value;
    const str = value.toString().toLowerCase();
    const match = str.match(/^(\d+)(ms|s|m|h|d)?$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const num = parseInt(match[1], 10);
    const unit = match[2] || 'd';
    switch (unit) {
      case 'ms': return num;
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // ============================================
  // PROFILE
  // ============================================

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        typeCompte: true,
        avatar: true,
        avatarUrl: true,
        localisation: true,
        stripeCustomerId: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        typeCompte: true,
        avatar: true,
        avatarUrl: true,
        localisation: true,
        stripeCustomerId: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        emailVerifiedAt: true,
        cguVersionAcceptee: true,
        cguAccepteeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Access denied');
    }

    const imprimeurProfil = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });

    return {
      ...user,
      imprimeurProfil: imprimeurProfil || null,
    };
  }

  // ============================================
  // PASSWORD CHANGE — revokes all refresh tokens
  // ============================================

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke ALL refresh tokens (CDC T-1.5)
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password changed successfully' };
  }

  // ============================================
  // FORGOT PASSWORD — CDC T-1.5
  // ============================================

  /**
   * Generate a password reset token (JWT with expiry) and store it.
   * Always returns the same response regardless of user existence.
   * Token expires after PASSWORD_RESET_TOKEN_HOURS (1 h).
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      // Don't reveal if user exists (CDC T-1.5)
      return;
    }

    // Generate reset token (JWT with short expiry)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('PASSWORD_RESET_TOKEN_HOURS', '1h') || '1h',
      },
    );

    // Store in a dedicated table or use a simple approach:
    // Store hashed token in user table as resetTokenHash
    const tokenHash = await bcrypt.hash(resetToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Verify the reset token
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.resetTokenHash) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Verify token hash
    const isTokenValid = await bcrypt.compare(token, user.resetTokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetTokenHash: null, // Invalidate the token
      },
    });

    // Revoke ALL refresh tokens (CDC T-1.5)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ============================================
  // EMAIL VERIFICATION — CDC T-1.2
  // ============================================

  async verifyEmail(token: string): Promise<void> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    if (payload.type !== 'email_verification') {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerifieAt: new Date() },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.emailVerifieAt) {
      // Already verified
      return;
    }

    const verificationToken = this.jwtService.sign(
      { sub: user.id, type: 'email_verification' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '24h',
      },
    );

    // TODO: Send email with verification link
    // For now, just store it (in production, use Resend via Novu)
    this.logger.log(`Email verification token for ${email}: ${verificationToken}`);
  }

  // ============================================
  // OAUTH — CDC T-1.4
  // ============================================

  async oauthCallback(dto: OAuthCallbackDto): Promise<AuthResult> {
    // Check if an OAuth account already exists with this provider + providerUserId
    let existingOauth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: dto.provider,
          providerUserId: dto.providerUserId,
        },
      },
    });

    let user = null;

    if (existingOauth) {
      // Link to existing user
      user = await this.prisma.user.findUnique({
        where: { id: existingOauth.userId },
      });
    } else {
      // Check if user already exists with this email
      let existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        // Check if they already have a password (i.e., email registered with password)
        if (existingUser.passwordHash) {
          throw new ConflictException(
            'Un compte existe déjà avec cet email. Connectez-vous avec mot de passe.',
          );
        }

        // Link OAuth to existing email-only account
        user = existingUser;
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            nom: dto.nom,
            prenom: dto.prenom,
            typeCompte: 'particulier',
            // OAuth users are considered verified
            emailVerifieAt: new Date(),
          },
        });
      }

      // Create OAuth account record
      existingOauth = await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: dto.provider,
          providerUserId: dto.providerUserId,
        },
      });
    }

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        typeCompte: user.typeCompte,
        emailVerifiedAt: user.emailVerifieAt,
      },
      ...tokens,
    };
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    // Check if email is being changed and if it's already taken
    if (updateDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateDto.email },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateDto.nom !== undefined && { nom: updateDto.nom }),
        ...(updateDto.prenom !== undefined && { prenom: updateDto.prenom }),
        ...(updateDto.email !== undefined && { email: updateDto.email }),
        ...(updateDto.avatar !== undefined && { avatar: updateDto.avatar }),
        ...(updateDto.avatarUrl !== undefined && { avatarUrl: updateDto.avatarUrl }),
        ...(updateDto.localisation !== undefined && { localisation: updateDto.localisation }),
        ...(updateDto.actifVendeur !== undefined && { actifVendeur: updateDto.actifVendeur }),
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        typeCompte: true,
        avatar: true,
        avatarUrl: true,
        localisation: true,
        stripeCustomerId: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Also create/update imprimeur profile if actifVendeur changed to true
    if (updateDto.actifVendeur === true) {
      const existingProfil = await this.prisma.imprimeurProfil.findUnique({
        where: { userId },
      });

      if (!existingProfil) {
        await this.prisma.imprimeurProfil.create({
          data: {
            userId,
            imprimantes: [],
            materiaux: [],
            localisation: {},
            delaiMoyenJours: 7,
            tarifsIndicatifs: {},
          },
        });
      }
    }

    return updatedUser;
  }
}
