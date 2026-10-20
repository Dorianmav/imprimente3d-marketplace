import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('checkout-expiration')
export class CheckoutExpirationWorker {
  private readonly logger = new Logger(CheckoutExpirationWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('checkout-expiration')
  async handleCheckoutExpiration(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;
    this.logger.log(`Checkout expired for commande ${commandeId}`);

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande || commande.statut !== 'EN_ATTENTE_PAIEMENT') {
      return;
    }

    // Cancel the order
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: 'non_paiement',
      },
    });

    // TODO: Release stock reservation
    // TODO: Send notification to buyer and seller
    this.logger.log(`Commande ${commandeId} cancelled due to checkout expiration`);
  }
}
