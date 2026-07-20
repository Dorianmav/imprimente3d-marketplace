import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
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
        siret: true,
        numeroTva: true,
        nomCommercial: true,
        adresseFacturation: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      total: users.length,
      users,
    };
  }
}
