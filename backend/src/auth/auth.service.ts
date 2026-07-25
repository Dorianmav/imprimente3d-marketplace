import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { StringValue } from 'ms';
import { User,Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DeleteAccountDto,
  ForgotPasswordDto,
  LoginDto,
  ResendCodeDto,
  ResetPasswordDto,
  SignupDto,
  VerifyAccountDto,
} from './dto/auth.dto';
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

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      const verifyToken = this.generateVerifyToken(user.email);
      await this.mailService.sendVerificationLink(user.email, verifyToken);

      return {
        requiresVerification: true,
        message: 'Compte non vérifié. Nouveau lien envoyé par email.',
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
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  private generateVerifyToken(email: string): string {
    return this.jwtService.sign(
      { email, purpose: 'verify' },
      {
        secret: this.configService.get<string>('VERIFY_TOKEN_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });
    if (existingUser) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(signupDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        passwordHash,
        nom: signupDto.nom,
        prenom: signupDto.prenom,
        typeCompte: signupDto.typeCompte ?? 'particulier',
      },
    });

    const verifyToken = this.generateVerifyToken(user.email);
    await this.mailService.sendVerificationLink(user.email, verifyToken);

    return {
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
      email: user.email,
    };
  }

  async verifyAccount(dto: VerifyAccountDto) {
    let payload: { email: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.configService.get<string>('VERIFY_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Lien invalide ou expiré');
    }

    if (payload.purpose !== 'verify') {
      throw new UnauthorizedException('Lien invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) throw new UnauthorizedException('Lien invalide');
    if (user.isVerified) throw new ConflictException('Compte déjà vérifié');

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
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
    if (!user) return { message: 'Si ce compte existe, un lien a été envoyé.' };
    if (user.isVerified) throw new ConflictException('Compte déjà vérifié');

    const verifyToken = this.generateVerifyToken(user.email);
    await this.mailService.sendVerificationLink(user.email, verifyToken);

    return { message: 'Lien renvoyé par email.' };
  }

  private generateResetToken(email: string): string {
    return this.jwtService.sign(
      { email, purpose: 'reset' },
      {
        secret: this.configService.get<string>('RESET_TOKEN_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user)
      return { message: 'Si ce compte existe, un email a été envoyé.' };

    const resetToken = this.generateResetToken(user.email);
    await this.mailService.sendPasswordResetLink(user.email, resetToken);

    return { message: 'Si ce compte existe, un email a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    Logger.log(`Token reçu: ${dto.token}`);
    let payload: { email: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.configService.get<string>('RESET_TOKEN_SECRET'),
      });
      Logger.log(`Payload décodé: ${JSON.stringify(payload)}`);
    } catch (err) {
      Logger.error(`Échec vérif token: ${err}`);
      throw new UnauthorizedException('Lien invalide ou expiré');
    }

    if (payload.purpose !== 'reset') {
      throw new UnauthorizedException('Lien invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) throw new UnauthorizedException('Lien invalide');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, refreshToken: null },
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
      isVerified: user.isVerified,
      stripeOnboardingComplete: user.stripeOnboardingComplete,
    };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Access denied');
    if (user.deletedAt) throw new ConflictException('Compte déjà supprimé');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Mot de passe incorrect');

    const anonymizedEmail = `deleted-${userId}@deleted.local`;

    await this.prisma.$transaction(async (tx) => {
      // Contenu personnel exprimé par l'utilisateur, sans valeur informative pour la contrepartie
      await tx.message.updateMany({
        where: { expediteurId: userId },
        data: { contenu: '[Message supprimé]' },
      });

      await tx.avis.updateMany({
        where: { auteurId: userId },
        data: { commentaire: '[Commentaire supprimé]' },
      });

      await tx.devis.updateMany({
        where: { imprimeurId: userId },
        data: { message: null },
      });

      // Annonces référencées par d'autres users (devis, commandes) — anonymiser, pas supprimer
      await tx.annonceVente.updateMany({
        where: { vendeurId: userId },
        data: {
          titre: '[Annonce supprimée]',
          description: '[Annonce supprimée]',
          photos: [],
          statut: 'ARCHIVEE',
        },
      });

      await tx.annonceDemande.updateMany({
        where: { acheteurId: userId },
        data: {
          titre: '[Demande supprimée]',
          description: null,
          photosReference: [],
          fichier3d: null,
          statut: 'ANNULEE',
        },
      });

      // Relations sans contrepartie externe → suppression réelle sans risque
      await tx.userBlock.deleteMany({ where: { blockerId: userId } });
      await tx.userBlock.deleteMany({ where: { blockedId: userId } });
      await tx.conversationParticipant.deleteMany({ where: { userId } });
      await tx.imprimeurProfil.deleteMany({ where: { userId } });

      // Anonymisation du compte lui-même — ligne conservée pour intégrité FK
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          passwordHash: crypto.randomUUID(),
          nom: 'Utilisateur',
          prenom: 'Supprimé',
          avatar: null,
          localisation: Prisma.JsonNull,
          stripeCustomerId: null,
          stripeAccountId: null,
          stripeOnboardingComplete: false,
          siret: null,
          numeroTva: null,
          nomCommercial: null,
          adresseFacturation: null,
          stripeBusinessType: null,
          refreshToken: null,
          deletedAt: new Date(),
        },
      });
    });

    return { message: 'Compte supprimé.' };
  }

  async getUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        imprimeurProfil: true,
        annoncesVente: true,
        annoncesDemande: true,
        devis: true,
        commandesAcheteur: true,
        commandesVendeur: true,
        avisDonnes: true,
        avisRecus: true,
        messages: true,
        offres: true,
        signalements: true,
      },
    });

    if (!user) throw new UnauthorizedException('Access denied');

    const { passwordHash, refreshToken, ...safeUser } = user;

    return safeUser;
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
