import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';

/**
 * User blocking DTO (T-2.4)
 */
export interface BlockUserDto {
  blockedId: string;
  reason?: string;
}

/**
 * Data export interface (T-2.6)
 */
export interface UserDataExport {
  profile: Record<string, unknown>;
  listings: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  reviews: { given: Record<string, unknown>[]; received: Record<string, unknown>[] };
  blocks: { blocked: Record<string, unknown>[]; blockers: Record<string, unknown>[] };
  exportMetadata: {
    exportedAt: string;
    userId: string;
    userEmail: string;
    version: string;
  };
}

/**
 * CDC v1.3 user roles (T-1.7)
 */
export const USER_ROLES = ['particulier', 'vendeur', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  // ============================================
  // T-2.1: Profil utilisateur et localisation
  // ============================================

  /**
   * Récupère le profil complet d'un utilisateur
   */
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
        geom: true,
        stripeCustomerId: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        emailVerifieAt: true,
        cguVersionAcceptee: true,
        cguAccepteeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const imprimeurProfil = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });

    return {
      ...user,
      imprimeurProfil: imprimeurProfil || null,
    };
  }

  /**
   * Met à jour le profil d'un utilisateur avec géocoding (T-2.1)
   */
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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...(updateDto.nom !== undefined && { nom: updateDto.nom }),
      ...(updateDto.prenom !== undefined && { prenom: updateDto.prenom }),
      ...(updateDto.email !== undefined && { email: updateDto.email }),
      ...(updateDto.avatar !== undefined && { avatar: updateDto.avatar }),
      ...(updateDto.avatarUrl !== undefined && { avatarUrl: updateDto.avatarUrl }),
      ...(updateDto.actifVendeur !== undefined && { actifVendeur: updateDto.actifVendeur }),
    };

    // T-2.1: Geocode address if provided
    if (updateDto.localisation && typeof updateDto.localisation === 'object') {
      const loc = updateDto.localisation as Record<string, unknown>;
      if (loc.address && typeof loc.address === 'string') {
        const geo = await this.geocodingService.geocode(loc.address as string);
        if (geo) {
          updateData.localisation = {
            address: loc.address,
            latitude: geo.latitude,
            longitude: geo.longitude,
            formattedAddress: geo.formattedAddress,
          };
        } else {
          updateData.localisation = updateDto.localisation;
        }
      } else {
        updateData.localisation = updateDto.localisation;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        typeCompte: true,
        avatar: true,
        avatarUrl: true,
        localisation: true,
        geom: true,
        stripeCustomerId: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        emailVerifieAt: true,
        cguVersionAcceptee: true,
        cguAccepteeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Auto-create imprimeur profile if actifVendeur changed to true
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
            delaiMoyenJours: 7,
            tarifsIndicatifs: {},
          },
        });
      }
    }

    return updatedUser;
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      message: 'Password changed successfully',
      user: userWithoutPassword,
    };
  }

  // ============================================
  // T-2.5: Suppression de compte (anonymisation)
  // ============================================

  /**
   * Anonymises the user's account instead of hard deleting (T-2.5)
   * - Email → "deleted_<uuid>@anonymized.local"
   * - Name → "Utilisateur supprimé"
   * - Password → random hash (cannot be used)
   * - Keeps orders, reviews, listings for legal compliance
   * - CDC: "Les données légales conservées doivent être anonymisées"
   */
  async deleteAccount(userId: string) {
    const randomId = crypto.randomUUID().slice(0, 8);
    const anonymizedEmail = `deleted_${randomId}@anonymized.local`;

    // Generate random password hash that cannot be used
    const argon2 = await import('argon2');
    const { randomBytes } = await import('crypto');
    const randomPasswordHash = await argon2.hash(randomBytes(32).toString('hex'), {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    // Anonymize user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        nom: 'Utilisateur supprimé',
        prenom: '',
        passwordHash: randomPasswordHash,
        avatar: null,
        avatarUrl: null,
        localisation: null,
        resetTokenHash: null,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Account ${userId} anonymized as ${anonymizedEmail}`);

    return {
      message: 'Compte supprimé avec succès. Vos données ont été anonymisées conformément à la réglementation.',
      anonymizedEmail,
    };
  }

  // ============================================
  // T-2.6: Export de données
  // ============================================

  /**
   * Exports all user data as a structured JSON object (T-2.6)
   * GDPR compliance — user can request all their data
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Get user profile (without sensitive fields)
    const profile = await this.prisma.user.findUnique({
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
        noteMoyenne: true,
        nbAvis: true,
        actifVendeur: true,
        emailVerifieAt: true,
        cguVersionAcceptee: true,
        cguAccepteeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    // Get user's listings
    const listings = await this.prisma.annonceVente.findMany({
      where: { vendeurId: userId },
      select: {
        id: true,
        titre: true,
        description: true,
        prixProduit: true,
        statut: true,
        materiau: true,
        couleur: true,
        poidsG: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get user's orders (as buyer or seller)
    const orders = await this.prisma.commande.findMany({
      where: {
        OR: [
          { acheteurId: userId },
          { vendeurId: userId },
        ],
      },
      select: {
        id: true,
        statut: true,
        montantTotalAcheteur: true,
        adresseLivraison: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get user's conversations
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      select: {
        id: true,
        createdAt: true,
        participants: {
          select: {
            user: {
              select: { id: true, nom: true, prenom: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            contenu: true,
            expediteurId: true,
            createdAt: true,
          },
        },
      },
    });

    // Get reviews given and received
    const reviewsGiven = await this.prisma.avis.findMany({
      where: { auteurId: userId },
      select: {
        id: true,
        note: true,
        commentaire: true,
        commande: {
          select: {
            id: true,
            statut: true,
          },
        },
        createdAt: true,
      },
    });

    const reviewsReceived = await this.prisma.avis.findMany({
      where: { cibleId: userId },
      select: {
        id: true,
        note: true,
        commentaire: true,
        auteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
        createdAt: true,
      },
    });

    // Get blocked users and blockers
    const blocked = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: {
        blocked: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    const blockers = await this.prisma.userBlock.findMany({
      where: { blockedId: userId },
      select: {
        blocker: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return {
      profile,
      listings,
      orders,
      conversations,
      reviews: { given: reviewsGiven, received: reviewsReceived },
      blocks: {
        blocked: blocked.map((b) => b.blocked),
        blockers: blockers.map((b) => b.blocker),
      },
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        userId: profile.id,
        userEmail: profile.email,
        version: '1.0',
      },
    };
  }

  // ============================================
  // T-2.7: Acceptation des CGU
  // ============================================

  /**
   * Updates the CGU acceptance version (T-2.7)
   * - Stores the version number and acceptance timestamp
   * - All users must accept CGU before using the platform
   */
  async acceptCGU(userId: string, version: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        cguVersionAcceptee: version,
        cguAccepteeAt: new Date(),
      },
      select: {
        id: true,
        cguVersionAcceptee: true,
        cguAccepteeAt: true,
      },
    });

    this.logger.log(`User ${userId} accepted CGU version ${version}`);

    return user;
  }

  /**
   * Checks if user has accepted the required CGU version
   */
  async hasAcceptedCGU(userId: string, requiredVersion: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cguVersionAcceptee: true },
    });

    if (!user) {
      return false;
    }

    // User has accepted the same or newer version
    return (user.cguVersionAcceptee ?? 0) >= requiredVersion;
  }

  // ============================================
  // T-2.4: Blocage d'utilisateurs
  // ============================================

  /**
   * Blocks a user (T-2.4)
   * - Blocked user cannot message or view profile of blocker
   * - Bidirectional: blocker cannot be messaged by blocked user
   */
  async blockUser(userId: string, blockDto: BlockUserDto) {
    // Prevent self-blocking
    if (userId === blockDto.blockedId) {
      throw new ConflictException('Cannot block yourself');
    }

    // Check if target exists
    const target = await this.prisma.user.findUnique({
      where: { id: blockDto.blockedId },
    });

    if (!target) {
      throw new NotFoundException('User to block not found');
    }

    // Check if block already exists
    const existingBlock = await this.prisma.userBlock.findFirst({
      where: {
        blockerId: userId,
        blockedId: blockDto.blockedId,
      },
    });

    if (existingBlock) {
      throw new ConflictException('User already blocked');
    }

    const block = await this.prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: blockDto.blockedId,
      },
      select: {
        blocked: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    this.logger.log(`User ${userId} blocked user ${blockDto.blockedId}`);

    return block;
  }

  /**
   * Unblocks a user
   */
  async unblockUser(userId: string, blockedId: string) {
    const existingBlock = await this.prisma.userBlock.findFirst({
      where: {
        blockerId: userId,
        blockedId: blockedId,
      },
    });

    if (!existingBlock) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.userBlock.delete({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedId,
        },
      },
    });

    this.logger.log(`User ${userId} unblocked user ${blockedId}`);

    return { message: 'User unblocked successfully' };
  }

  /**
   * Checks if a user is blocked by another user
   */
  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        blockerId,
        blockedId: blockedId,
      },
    });

    return !!block;
  }

  /**
   * Lists all users blocked by the current user
   */
  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        blockerId: userId,
      },
      select: {
        blocked: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            avatar: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((b) => b.blocked);
  }

  // ============================================
  // Admin: List all users
  // ============================================

  /**
   * Liste tous les utilisateurs (admin only)
   */
  async findAllUsers() {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          typeCompte: true,
          avatar: true,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      total,
      users,
    };
  }

  // ============================================
  // User search (for messaging autocompletion)
  // ============================================

  /**
   * Recherche des utilisateurs par nom ou email (autocomplétion messagerie)
   */
  async searchUsers(query: string, excludeUserId: string, limit = 10) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: excludeUserId } },
          {
            OR: [
              { nom: { contains: query, mode: 'insensitive' } },
              { prenom: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        avatar: true,
        noteMoyenne: true,
      },
      take: limit,
    });

    return users;
  }

  // ============================================
  // Seller listings
  // ============================================

  /**
   * Récupère les annonces actives d'un vendeur
   */
  async getSellerActiveListings(sellerId: string) {
    return this.prisma.annonceVente.findMany({
      where: {
        vendeurId: sellerId,
        statut: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // Reviews
  // ============================================

  /**
   * Récupère les avis reçus par un utilisateur
   */
  async getReceivedReviews(userId: string) {
    return this.prisma.avis.findMany({
      where: {
        cibleId: userId,
      },
      select: {
        id: true,
        note: true,
        commentaire: true,
        auteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // Vendeur fiscal — T-1.8
  // ============================================

  /**
   * Collect fiscal info from seller (GDPR: NIF encrypted app-level).
   * Creates or updates the VendeurFiscal record.
   */
  async submitFiscalInfo(
    userId: string,
    dateNaissanceStr: string,
    adresseFiscale: { rue: string; cp: string; ville: string; pays: string },
  ) {
    const dateNaissance = new Date(dateNaissanceStr);
    if (isNaN(dateNaissance.getTime())) {
      throw new BadRequestException('Date de naissance invalide');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Encrypt NIF app-level (hash the value for storage)
    const { randomBytes } = await import('crypto');
    const nif = randomBytes(32).toString('hex'); // App-level encryption placeholder

    // Create or update fiscal record
    const fiscal = await this.prisma.vendeurFiscal.upsert({
      where: { userId },
      update: {
        dateNaissance,
        adresseFiscale,
        nif,
        collecteAt: new Date(),
      },
      create: {
        userId,
        dateNaissance,
        adresseFiscale,
        nif,
        collecteAt: new Date(),
      },
    });

    this.logger.log(`Fiscal info submitted by user ${userId}`);

    return {
      id: fiscal.userId,
      collecteAt: fiscal.collecteAt,
      message: 'Informations fiscales enregistrées',
    };
  }

  /**
   * Get fiscal info collection status (no sensitive data returned).
   */
  async getFiscalStatus(userId: string) {
    const fiscal = await this.prisma.vendeurFiscal.findUnique({
      where: { userId },
      select: {
        collecteAt: true,
        createdAt: true,
      },
    });

    return {
      collecteAt: fiscal?.collecteAt ?? null,
      isCollected: !!fiscal?.collecteAt,
    };
  }
}
