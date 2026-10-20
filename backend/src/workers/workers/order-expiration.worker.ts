import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('order-expiration')
export class OrderExpirationWorker {
  private readonly logger = new Logger(OrderExpirationWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('order-expiration')
  async handleOrderExpiration(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;
    this.logger.log(`Shipping deadline expired for commande ${commandeId}`);

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande) {
      return;
    }

    // Only cancel if not shipped and not already cancelled
    if (commande.statut !== 'PAYEE' && commande.statut !== 'EXPEDIEE') {
      return;
    }

    // Cancel the order with automatic refund
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: 'non_expedition',
      },
    });

    // TODO: Process Stripe refund
    // TODO: Record seller incident
    // TODO: Send notifications to buyer and seller
    this.logger.log(`Commande ${commandeId} cancelled — non-expédition`);
  }
}
