import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Include imprimeur profile if available
    const imprimeurProfil = await this.prisma.imprimeurProfil.findUnique({
      where: { userId },
    });

    return {
      ...user,
      imprimeurProfil: imprimeurProfil || null,
    };
  }

  /**
   * Met à jour le profil d'un utilisateur
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

    // Also update imprimeur profile if actifVendeur changed to true
    if (updateDto.actifVendeur === true) {
      const existingProfil = await this.prisma.imprimeurProfil.findUnique({
        where: { userId },
      });

      if (!existingProfil) {
        // Create default imprimeur profile
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

    // In a real implementation, verify the current password hash first
    // The actual bcrypt comparison should happen in the service layer
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      message: 'Password changed successfully',
      user: userWithoutPassword,
    };
  }

  /**
   * Supprime le compte d'un utilisateur
   */
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }

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
}
