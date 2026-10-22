import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Review worker — double-blind publication (CDC §5)
 *
 * After delivery, both parties have REVIEW_WINDOW_DAYS (14 days) to submit reviews.
 * Reviews become visible when BOTH parties have submitted (double-blind).
 * This worker:
 * 1. Runs 48h after delivery — checks if both reviews are submitted
 * 2. If so, publishes both
 * 3. Recalculates note_moyenne and nb_avis on User and ImprimeurProfil
 */
@Processor('review')
export class ReviewWorker extends WorkerHost {
  private readonly logger = new Logger(ReviewWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'review-publish') {
      return this.handleReviewPublish(job);
    }
  }

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

    // Check each review — publish if the other party has also published
    const toPublish: string[] = [];

    for (const review of reviews) {
      const otherReview = await this.prisma.avis.findFirst({
        where: {
          commandeId,
          type: review.type === 'ACHETEUR_VERS_VENDEUR' ? 'VENDEUR_VERS_ACHETEUR' : 'ACHETEUR_VERS_VENDEUR',
        },
      });

      if (otherReview && otherReview.publieAt) {
        // Both parties have published — publish this review
        toPublish.push(review.id);
      }
    }

    // Publish reviews
    for (const reviewId of toPublish) {
      await this.prisma.avis.update({
        where: { id: reviewId },
        data: { publieAt: new Date() },
      });
      this.logger.log(`Review ${reviewId} published for commande ${commandeId}`);
    }

    // Recalculate note_moyenne and nb_avis on User and ImprimeurProfil
    if (toPublish.length > 0) {
      await this.recalculateRatings(commandeId);
    }
  }

  /**
   * Recalculate average rating and review count for both parties.
   * Called whenever a review is published (CDC §5).
   */
  private async recalculateRatings(commandeId: string) {
    // Get both reviews for this command
    const reviews = await this.prisma.avis.findMany({
      where: {
        commandeId,
        publieAt: { not: null },
      },
    });

    if (reviews.length === 0) return;

    // Update buyer->seller rating
    const sellerReview = reviews.find(r => r.type === 'ACHETEUR_VERS_VENDEUR');
    const buyerReview = reviews.find(r => r.type === 'VENDEUR_VERS_ACHETEUR');

    if (sellerReview) {
      // Update seller's average rating
      const sellerRatings = await this.prisma.avis.findMany({
        where: {
          cibleId: sellerReview.auteurId,
          type: 'ACHETEUR_VERS_VENDEUR',
          publieAt: { not: null },
        },
        select: { note: true },
      });

      const totalRating = sellerRatings.reduce((sum, r) => sum + r.note, 0);
      const avgRating = sellerRatings.length > 0 ? totalRating / sellerRatings.length : 0;

      await this.prisma.user.update({
        where: { id: sellerReview.auteurId },
        data: {
          noteMoyenne: parseFloat(avgRating.toFixed(1)),
          nbAvis: sellerRatings.length,
        },
      });

      // Update imprimeur profil if seller is an imprimeur
      const imprimeur = await this.prisma.imprimeurProfil.findUnique({
        where: { userId: sellerReview.auteurId },
      });

      // Update user rating (noteMoyenne/nbAvis are on User, not ImprimeurProfil)
      await this.prisma.user.update({
        where: { id: sellerReview.auteurId },
        data: {
          noteMoyenne: parseFloat(avgRating.toFixed(1)),
          nbAvis: sellerRatings.length,
        },
      });

      this.logger.log(`Seller ${sellerReview.auteurId} rating recalculated: ${avgRating.toFixed(1)} (${sellerRatings.length} reviews)`);
    }

    if (buyerReview) {
      // Update buyer's average rating (from seller->buyer reviews)
      const buyerRatings = await this.prisma.avis.findMany({
        where: {
          cibleId: buyerReview.auteurId,
          type: 'VENDEUR_VERS_ACHETEUR',
          publieAt: { not: null },
        },
        select: { note: true },
      });

      const totalRating = buyerRatings.reduce((sum, r) => sum + r.note, 0);
      const avgRating = buyerRatings.length > 0 ? totalRating / buyerRatings.length : 0;

      await this.prisma.user.update({
        where: { id: buyerReview.auteurId },
        data: {
          noteMoyenne: parseFloat(avgRating.toFixed(1)),
          nbAvis: buyerRatings.length,
        },
      });

      this.logger.log(`Buyer ${buyerReview.auteurId} rating recalculated: ${avgRating.toFixed(1)} (${buyerRatings.length} reviews)`);
    }
  }
}
