import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MotifLitige } from '../generated/prisma';
import { NotificationService } from '../notification/notification.service';
import { WorkersService } from '../workers/workers.service';

@Injectable()
export class LitigeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly workersService: WorkersService,
  ) {}

  /**
   * Open a dispute on a delivered commande
   */
  async openDispute(
    userId: string,
    commandeId: string,
    motif: MotifLitige,
    description: string,
    photos: string[],
  ) {
    // Verify the commande exists and is delivered (statut = LIVREE)
    const commande = await this.prisma.commande.findFirst({
      where: { id: commandeId, statut: 'LIVREE' },
      include: { vendeur: { select: { id: true } } },
    });
    if (!commande) {
      throw new NotFoundException('Commande non trouvée ou non livrée');
    }

    // Prevent duplicate open disputes on the same commande
    const existing = await this.prisma.litige.findUnique({
      where: { commandeId },
    });
    if (existing) {
      throw new ConflictException('Un litige existe déjà pour cette commande');
    }

    const litige = await this.prisma.litige.create({
      data: {
        ouvertParId: userId,
        commandeId,
        motif,
        description,
        photos,
      },
    });

    // Update command status to LITIGE
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: { statut: 'LITIGE' },
    });

    // Notify seller
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'REPORT_ACKNOWLEDGED',
      data: {
        message: `Litige ouvert sur la commande ${commandeId}`,
      },
    });

    // Schedule seller response reminder (48h)
    await this.workersService.scheduleDisputeResponse(
      commandeId,
      48 * 60 * 60 * 1000,
    );

    return litige;
  }

  /**
   * Seller responds to an open dispute
   */
  async respondToDispute(id: string, userId: string, reponse: string) {
    const litige = await this.prisma.litige.findUnique({
      where: { id },
      include: { commande: { select: { vendeurId: true, acheteurId: true } } },
    });
    if (!litige) {
      throw new NotFoundException('Litige non trouvé');
    }

    // Only the seller of the related commande can respond
    if (litige.commande.vendeurId !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à répondre à ce litige');
    }

    const updated = await this.prisma.litige.update({
      where: { id },
      data: { reponseVendeur: reponse, reponseAt: new Date(), statut: 'REPONSE_VENDEUR' as const },
      include: { commande: { select: { acheteurId: true } } },
    });

    // Notify buyer that seller has responded
    await this.notificationService.sendNotification({
      userId: updated.commande.acheteurId,
      event: 'NEW_MESSAGE',
      data: {
        message: `Le vendeur a répondu à votre litige`,
      },
    });

    return updated;
  }

  /**
   * Get dispute by ID
   */
  async findById(id: string) {
    return this.prisma.litige.findUnique({
      where: { id },
      include: {
        commande: {
          select: {
            id: true,
            quantite: true,
            montantTotalAcheteur: true,
            createdAt: true,
          },
        },
        ouvertPar: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
    });
  }

  /**
   * Get disputes opened by a user
   */
  async findByUser(userId: string) {
    return this.prisma.litige.findMany({
      where: { ouvertParId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        commande: {
          select: {
            id: true,
            quantite: true,
            montantTotalAcheteur: true,
          },
        },
      },
    });
  }

  /**
   * Admin arbitration — close & optionally refund
   */
  async arbitrate(
    id: string,
    decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    montantRembourse: number,
    noteAdmin: string,
    adminId: string,
  ) {
    const litige = await this.prisma.litige.findUnique({ where: { id } });
    if (!litige) {
      throw new NotFoundException('Litige non trouvé');
    }

    const updated = await this.prisma.litige.update({
      where: { id },
      data: {
        decision,
        montantRembourse,
        noteAdmin,
        decideParId: adminId,
        closedAt: new Date(),
        statut: 'CLOS' as const,
      },
      include: { commande: true },
    });

    // Notify buyer and seller
    await this.notificationService.sendNotification({
      userId: updated.commande.acheteurId,
      event: 'REPORT_ACKNOWLEDGED',
      data: {
        message: `Litige ${id} réglé — décision: ${decision}`,
        amount: montantRembourse,
      },
    });
    await this.notificationService.sendNotification({
      userId: updated.commande.vendeurId,
      event: 'REPORT_ACKNOWLEDGED',
      data: {
        message: `Litige ${id} réglé — décision: ${decision}`,
      },
    });

    return updated;
  }
}
