import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Dispute worker (CDC §8.4)
 *
 * Handles dispute timeline:
 * 1. Dispute opened → notify seller (72h response) and admin
 * 2. Seller response deadline → escalate to admin if no response
 * 3. Admin arbitration → process refund/release
 */
@Processor('dispute')
export class DisputeWorker extends WorkerHost {
  private readonly logger = new Logger(DisputeWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'dispute-open') {
      return this.handleDisputeOpen(job);
    }
    if (job.name === 'dispute-seller-response-deadline') {
      return this.handleSellerResponseDeadline(job);
    }
  }

  /**
   * Handle dispute open event
   * Notifies seller and admin (CDC §8.4)
   */
  async handleDisputeOpen(job: Job<{ commandeId: string; ouvertParId: string; motif: string }>) {
    const { commandeId, ouvertParId, motif } = job.data;

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        acheteur: { select: { nom: true, prenom: true, email: true } },
        vendeur: { select: { nom: true, prenom: true, email: true } },
      },
    });

    if (!commande) {
      this.logger.error(`Commande ${commandeId} not found for dispute`);
      return;
    }

    // Update order status to LITIGE
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: { statut: 'LITIGE' },
    });

    // Create or update litige record
    await this.prisma.litige.upsert({
      where: { commandeId },
      update: {
        statut: 'OUVERT',
      },
      create: {
        commandeId,
        ouvertParId,
        motif: motif as any,
        description: '',
        statut: 'OUVERT',
      },
    });

    // Notify seller (CDC §8.4: vendeur notifié, DISPUTE_SELLER_RESPONSE_HOURS = 72h)
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'NEW_QUOTE',
      data: {
        message: `Litige ouvert sur la commande ${commandeId} — réponse requise sous 72h`,
        pushTitle: 'Litige ouvert',
        pushBody: `Le acheteur a ouvert un litige sur la commande ${commandeId}`,
      },
    });

    // Notify admin (CDC §8.4: admin arbitre)
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, nom: true, prenom: true },
    });

    for (const admin of admins) {
      await this.notificationService.sendNotification({
        userId: admin.id,
        event: 'QUOTE_ACCEPTED',
        data: {
          message: `Litige à arbitrer: commande ${commandeId} — ouvert par ${commande.acheteur.nom} ${commande.acheteur.prenom}`,
        },
      });
    }

    this.logger.log(`Dispute opened for commande ${commandeId} — seller and admins notified`);
  }

  /**
   * Handle seller response deadline (72h after dispute open)
   * If seller hasn't responded, escalate to admin
   */
  async handleSellerResponseDeadline(job: Job<{ commandeId: string; disputeId: string }>) {
    const { commandeId, disputeId } = job.data;

    const litige = await this.prisma.litige.findUnique({
      where: { id: disputeId },
      include: { commande: true },
    });

    if (!litige || litige.statut !== 'OUVERT') {
      return;
    }

    // Seller hasn't responded — escalate to admin
    this.logger.log(`Seller response deadline passed for dispute ${disputeId}`);

    await this.notificationService.sendNotification({
      userId: litige.commande.vendeurId,
      event: 'QUOTE_REFUSED',
      data: {
        message: `Délai de réponse au litige expiré — arbitrage admin requis`,
      },
    });

    // Update dispute status
    await this.prisma.litige.update({
      where: { id: disputeId },
      data: { statut: 'EN_ARBITRAGE' },
    });
  }
}
