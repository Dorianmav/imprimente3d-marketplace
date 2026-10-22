import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../../stripe/stripe.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Checkout expiration worker (CDC §8.1)
 * Cancels orders in EN_ATTENTE_PAIEMENT after CHECKOUT_TTL_MINUTES.
 * Releases stock reservation and notifies both parties.
 */
@Processor('checkout-expiration')
export class CheckoutExpirationWorker extends WorkerHost {
  private readonly logger = new Logger(CheckoutExpirationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'checkout-expiration') {
      return this.handleCheckoutExpiration(job);
    }
  }

  async handleCheckoutExpiration(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;
    this.logger.log(`Checkout expired for commande ${commandeId}`);

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { acheteur: true, vendeur: true },
    });

    if (!commande || commande.statut !== 'EN_ATTENTE_PAIEMENT') {
      return;
    }

    // Release stock reservation (CDC §8.1)
    await this.releaseStockReservation(commande);

    // Cancel the order
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: 'non_paiement',
      },
    });

    // Notify both parties
    await this.notificationService.sendNotification({
      userId: commande.acheteurId,
      event: 'ORDER_PAID',
      data: {
        message: `Paiement expiré — commande ${commandeId} annulée`,
      },
    });
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'OFFER_EXPIRED',
      data: {
        message: `Commande ${commandeId} annulée (paiement expiré)`,
      },
    });

    this.logger.log(`Commande ${commandeId} cancelled — stock released`);
  }

  /**
   * Release stock reservation for a cancelled order.
   * Increments stock for STOCK_LIMITE listings.
   */
  private async releaseStockReservation(commande: { sourceType: string; sourceId: string; quantite: number }) {
    if (commande.sourceType === 'ANNONCE_VENTE') {
      try {
        await this.prisma.annonceVente.update({
          where: { id: commande.sourceId },
          data: {
            stock: { increment: commande.quantite },
          },
        });
        this.logger.log(`Stock released for annonce ${commande.sourceId}: +${commande.quantite}`);
      } catch (error) {
        this.logger.error(`Failed to release stock: ${error.message}`);
      }
    }
  }
}
