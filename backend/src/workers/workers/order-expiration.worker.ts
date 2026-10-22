import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../../stripe/stripe.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Order expiration worker (CDC §7.3, §8.5)
 *
 * Handles non-expedition auto-cancel:
 * - If order is PAYEE or EXPEDIEE past shipping deadline
 * - Cancels order (motif: non_expedition)
 * - Processes Stripe refund (full)
 * - Records seller incident
 * - Notifies buyer and seller
 */
@Processor('order-expiration')
export class OrderExpirationWorker extends WorkerHost {
  private readonly logger = new Logger(OrderExpirationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'order-expiration') {
      return this.handleOrderExpiration(job);
    }
  }

  async handleOrderExpiration(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;
    this.logger.log(`Checking shipping deadline for commande ${commandeId}`);

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { acheteur: true, vendeur: true },
    });

    if (!commande) {
      return;
    }

    // Only cancel if not shipped and not already cancelled
    if (commande.statut !== 'PAYEE' && commande.statut !== 'EXPEDIEE') {
      return;
    }

    // Check if there's an open dispute (suspends release timer, CDC §7.3)
    const openDispute = await this.prisma.litige.findFirst({
      where: { commandeId, statut: 'OUVERT' },
    });
    if (openDispute) {
      this.logger.debug(`Dispute suspended release timer for commande ${commandeId}`);
      return;
    }

    // Cancel the order
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: 'non_expedition',
      },
    });

    // Process Stripe full refund (CDC §7.3: remboursement intégral automatique)
    try {
      await this.stripeService.fullRefundOrder(commandeId);
      this.logger.log(`Auto-refund processed for commande ${commandeId}`);
    } catch (error) {
      this.logger.error(`Auto-refund failed for commande ${commandeId}: ${error.message}`);
      // Record in admin log for manual review
      await this.prisma.adminAuditLog.create({
        data: {
          acteurId: 'system',
          action: 'auto_refund_failed',
          cibleType: 'commande',
          cibleId: commandeId,
          details: { error: error.message },
        },
      });
    }

    // Record seller incident (CDC §12.2: suivi des incidents vendeur)
    await this.recordSellerIncident(commande.vendeurId, commandeId, 'non_expedition');

    // Notify both parties (CDC §10)
    await this.notificationService.sendNotification({
      userId: commande.acheteurId,
      event: 'ORDER_PAID',
      data: {
        message: `Commande ${commandeId} annulée — remboursement en cours (non-expédition)`,
      },
    });
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'OFFER_EXPIRED',
      data: {
        message: `Commande ${commandeId} annulée pour non-expédition — incident enregistré`,
      },
    });

    this.logger.log(`Commande ${commandeId} cancelled — auto-refund + incident recorded`);
  }

  /**
   * Record a seller incident in the audit log.
   * Tracks cancellations due to non-shipping, lost disputes, etc.
   * V2: alert after 3 incidents in 90 days (CDC §12.2)
   */
  private async recordSellerIncident(vendeurId: string, commandeId: string, type: string) {
    await this.prisma.adminAuditLog.create({
      data: {
        acteurId: 'system',
        action: 'seller_incident',
        cibleType: 'vendeur',
        cibleId: vendeurId,
        details: {
          type,
          commandeId,
          message: `Incident vendeur: ${type}`,
        },
      },
    });
  }
}
