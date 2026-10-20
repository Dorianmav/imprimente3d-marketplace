import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('dispute')
export class DisputeWorker {
  private readonly logger = new Logger(DisputeWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('dispute-response')
  async handleDisputeResponse(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;

    const litige = await this.prisma.litige.findUnique({
      where: { commandeId },
      include: { commande: true },
    });

    if (!litige || litige.statut !== 'OUVERT') {
      return;
    }

    // Seller didn't respond in time — move to arbitration
    await this.prisma.litige.update({
      where: { id: litige.id },
      data: {
        statut: 'EN_ARBITRAGE',
      },
    });

    // TODO: Send notification to admin for arbitration
    this.logger.log(`Dispute for commande ${commandeId} moved to arbitration (seller didn't respond)`);
  }
}
