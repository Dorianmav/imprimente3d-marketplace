import { Process, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('review')
export class ReviewWorker {
  private readonly logger = new Logger(ReviewWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('review-publish')
  async handleReviewPublish(job: Job<{ commandeId: string }>) {
    const { commandeId } = job.data;

    // Find reviews for this command that haven't been published yet
    const reviews = await this.prisma.avis.findMany({
      where: {
        commandeId,
        publieAt: null,
      },
    });

    if (reviews.length === 0) {
      return;
    }

    // Check if both reviews are submitted (double-blind)
    // Publish both if the other party has also submitted
    for (const review of reviews) {
      const otherReview = await this.prisma.avis.findFirst({
        where: {
          commandeId,
          type: review.type === 'ACHETEUR_VERS_VENDEUR' ? 'VENDEUR_VERS_ACHETEUR' : 'ACHETEUR_VERS_VENDEUR',
        },
      });

      if (otherReview && otherReview.publieAt) {
        // Both parties have published — publish this review
        await this.prisma.avis.update({
          where: { id: review.id },
          data: { publieAt: new Date() },
        });
        this.logger.log(`Review ${review.id} published for commande ${commandeId}`);
      }
    }

    // TODO: Recalculate note_moyenne and nb_avis on User and ImprimeurProfil
  }
}
