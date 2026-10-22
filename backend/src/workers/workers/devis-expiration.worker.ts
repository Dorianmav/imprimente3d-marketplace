import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Devis expiration worker (CDC §8.2)
 * Handles accepted quotes that haven't been paid within the TTL (48h).
 * Rejects the quote, reopens the demande, and notifies both parties.
 */
@Processor('devis-expiration')
export class DevisExpirationWorker extends WorkerHost {
  private readonly logger = new Logger(DevisExpirationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'devis-expiration') {
      return this.handleDevisExpiration(job);
    }
  }

  async handleDevisExpiration(job: Job<{ devisId: string }>) {
    const { devisId } = job.data;
    this.logger.log(`Devis payment TTL expired for ${devisId}`);

    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        demande: {
          select: { acheteurId: true },
        },
        imprimeur: { select: { id: true } },
      },
    });

    if (!devis || devis.statut !== 'ACCEPTE') {
      // Already converted to order or manually accepted/refused
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Reject the expired quote
      await tx.devis.update({
        where: { id: devisId },
        data: { statut: 'REFUSE' },
      });

      // Reopen the demande for other quotes
      await tx.annonceDemande.update({
        where: { id: devis.demandeId },
        data: { statut: 'OUVERTE' },
      });

      // Record audit log
      await tx.adminAuditLog.create({
        data: {
          acteurId: 'SYSTEM',
          action: 'devis_payment_expired',
          cibleType: 'devis',
          cibleId: devisId,
          details: { demandeId: devis.demandeId, imprimeurId: devis.imprimeurId },
        },
      });
    });

    // Notify buyer and seller
    await this.notificationService.sendNotification({
      userId: devis.demande.acheteurId,
      event: 'OFFER_EXPIRED',
      data: {
        message: `Devis expiré — paiement non reçu dans les délais`,
      },
    });
    await this.notificationService.sendNotification({
      userId: devis.imprimeurId,
      event: 'OFFER_EXPIRED',
      data: {
        message: `Votre devis a expiré — paiement non reçu`,
      },
    });

    this.logger.log(`Devis ${devisId} expired — demande reopened`);
  }
}
