import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Offre messagerie expiration worker
 * Handles expired messaging offers (statut → EXPIREE after expireAt).
 */
@Processor('offre-expiration')
export class OffreExpirationWorker extends WorkerHost {
  private readonly logger = new Logger(OffreExpirationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'offre-expiration') {
      return this.handleExpiration(job);
    }
  }

  async handleExpiration(job: Job): Promise<void> {
    this.logger.log(`Checking for expired offers`);

    // Find expired pending offers
    const expiredOffres = await this.prisma.offreMessagerie.findMany({
      where: {
        statut: 'EN_ATTENTE',
        expireAt: { lt: new Date() },
      },
      include: {
        expediteur: true,
        destinataire: true,
        conversation: {
          include: {
            initiateur: true,
            destinataire: true,
          },
        },
      },
    });

    for (const offre of expiredOffres) {
      await this.prisma.offreMessagerie.update({
        where: { id: offre.id },
        data: { statut: 'EXPIREE' },
      });

      this.logger.log(`Offer ${offre.id} expired in conversation ${offre.conversationId}`);

      // Notify the recipient
      await this.notificationService.sendNotification({
        userId: offre.destinataireId,
        event: 'OFFER_EXPIRED',
        data: {
          userName: offre.destinataire.nom,
          message: `L'offre dans la conversation ${offre.conversation.id} a expiré.`,
        },
      });
    }
  }
}
