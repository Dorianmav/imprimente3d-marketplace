import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AvisService {
  private readonly logger = new Logger(AvisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================
  // T-9.1: Submit a review (after delivery)
  // ============================================

  /**
   * Creates a review for a delivered order.
   * Double-blind: review is published only after both parties submit
   * (or after the worker's delay).
   */
  async create(
    userId: string,
    commandeId: string,
    note: number,
    commentaire?: string,
  ) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        vendeur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        acheteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== 'LIVREE') {
      throw new ForbiddenException('Une review ne peut être déposée que pour une commande livrée');
    }

    // Determine direction (acheteur → vendeur or vendeur → acheteur)
    const estAcheteur = commande.acheteurId === userId;
    const cibleId = estAcheteur ? commande.vendeurId : commande.acheteurId;
    const type = estAcheteur ? 'ACHETEUR_VERS_VENDEUR' : 'VENDEUR_VERS_ACHETEUR';

    // Check if review already exists (double-blind: unique per commande+type)
    const existing = await this.prisma.avis.findFirst({
      where: {
        commandeId,
        type: type as any,
      },
    });

    if (existing) {
      throw new ConflictException('Un avis existe déjà pour cette commande dans cette direction');
    }

    // Prevent self-review
    if (userId === cibleId) {
      throw new ForbiddenException('Vous ne pouvez pas vous donner un avis à vous-même');
    }

    // Create the review (publieAt null = double-blind, published later)
    const avis = await this.prisma.avis.create({
      data: {
        commandeId,
        auteurId: userId,
        cibleId,
        note,
        commentaire,
        type: type as any,
      },
      include: {
        auteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        cible: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
    });

    this.logger.log(`Avis ${avis.id} created by ${userId} on commande ${commandeId} for cible ${cibleId}`);

    // Notify target user
    await this.notificationService.sendNotification({
      userId: cibleId,
      event: 'REVIEW_RECEIVED',
      data: {
        userName: estAcheteur ? commande.vendeur.nom : commande.acheteur.nom,
        message: `Nouvel avis de ${estAcheteur ? commande.vendeur.prenom : commande.acheteur.prenom}`,
      },
    });

    return avis;
  }

  // ============================================
  // T-9.2: Get reviews for a user (profile view)
  // ============================================

  async findByCible(cibleId: string) {
    const avis = await this.prisma.avis.findMany({
      where: {
        cibleId,
        publieAt: { not: null }, // Only published reviews
      },
      select: {
        id: true,
        note: true,
        commentaire: true,
        type: true,
        publieAt: true,
        createdAt: true,
        auteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average rating
    const avg = avis.length > 0
      ? avis.reduce((sum, a) => sum + a.note, 0) / avis.length
      : 0;

    return { avis, nbAvis: avis.length, noteMoyenne: Math.round(avg * 100) / 100 };
  }

  // ============================================
  // T-9.3: Get user's own reviews (given)
  // ============================================

  async findByAuteur(auteurId: string) {
    const avis = await this.prisma.avis.findMany({
      where: { auteurId },
      select: {
        id: true,
        note: true,
        commentaire: true,
        type: true,
        publieAt: true,
        createdAt: true,
        cible: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
        commande: {
          select: {
            id: true,
            statut: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { avis };
  }
}
