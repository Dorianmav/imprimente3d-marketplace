import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/**
 * Demande expiration worker
 * Checks for AnnonceDemande entries that have passed dateExpiration
 * while still OUVERTE or DEVIS_EN_COURS, and transitions them to EXPIREE.
 */
@Processor('demande-expiration')
export class DemandeExpirationWorker extends WorkerHost {
  private readonly logger = new Logger(DemandeExpirationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'demande-expiration') {
      return this.handleExpiration(job);
    }
  }

  async handleExpiration(job: Job): Promise<void> {
    this.logger.log(`Checking for expired demandes`);

    // Find expired open demandes
    const expiredDemandes = await this.prisma.annonceDemande.findMany({
      where: {
        statut: { in: ['OUVERTE', 'DEVIS_EN_COURS'] },
        dateExpiration: { lt: new Date() },
      },
      include: {
        acheteur: true,
        devis: true,
      },
    });

    for (const demande of expiredDemandes) {
      await this.prisma.$transaction(async (tx) => {
        // Expire the demande
        await tx.annonceDemande.update({
          where: { id: demande.id },
          data: { statut: 'EXPIREE' },
        });

        // Expire all pending quotes
        await tx.devis.updateMany({
          where: {
            demandeId: demande.id,
            statut: 'EN_ATTENTE',
          },
          data: { statut: 'EXPIRE' },
        });
      });

      this.logger.log(`Demande ${demande.id} expired — ${demande.titre}`);

      // Notify the buyer
      await this.notificationService.sendNotification({
        userId: demande.acheteurId,
        event: 'DEMAND_EXPIRED',
        data: {
          userName: demande.acheteur.nom,
          itemName: demande.titre,
          message: `Votre demande "${demande.titre}" a expiré.`,
        },
      });
    }
  }
}
