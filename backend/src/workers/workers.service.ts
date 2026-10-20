import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface WorkerJobData {
  [key: string]: unknown;
}

@Injectable()
export class WorkersService {
  constructor(
    @InjectQueue('checkout-expiration')
    private readonly checkoutQueue: Queue,
    @InjectQueue('order-expiration')
    private readonly orderQueue: Queue,
    @InjectQueue('vacation-mode')
    private readonly vacationQueue: Queue,
    @InjectQueue('dispute')
    private readonly disputeQueue: Queue,
    @InjectQueue('review')
    private readonly reviewQueue: Queue,
    @InjectQueue('message-cleanup')
    private readonly messageCleanupQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // Checkout expiration
  // ============================================

  async scheduleCheckoutExpiration(commandeId: string, delayMs: number): Promise<void> {
    await this.checkoutQueue.add('checkout-expiration', { commandeId }, {
      delay: delayMs,
      jobId: `checkout-exp:${commandeId}`,
      removeOnFail: 50,
    });
  }

  async cancelCheckoutExpiration(commandeId: string): Promise<void> {
    const job = await this.checkoutQueue.getJob(`checkout-exp:${commandeId}`);
    if (job) {
      await job.remove();
    }
  }

  // ============================================
  // Order expiration (shipping deadline)
  // ============================================

  async scheduleOrderExpiration(commandeId: string, delayMs: number): Promise<void> {
    await this.orderQueue.add('order-expiration', { commandeId }, {
      delay: delayMs,
      jobId: `order-exp:${commandeId}`,
      removeOnFail: 50,
    });
  }

  async cancelOrderExpiration(commandeId: string): Promise<void> {
    const job = await this.orderQueue.getJob(`order-exp:${commandeId}`);
    if (job) {
      await job.remove();
    }
  }

  // ============================================
  // Vacation mode check
  // ============================================

  async checkVacationMode(userId: string): Promise<void> {
    await this.vacationQueue.add('vacation-check', { userId }, {
      jobId: `vacation-check:${userId}`,
      removeOnFail: 50,
    });
  }

  // ============================================
  // Dispute handling
  // ============================================

  async scheduleDisputeResponse(commandeId: string, delayMs: number): Promise<void> {
    await this.disputeQueue.add('dispute-response', { commandeId }, {
      delay: delayMs,
      jobId: `dispute-response:${commandeId}`,
      removeOnFail: 50,
    });
  }

  // ============================================
  // Review double-blind
  // ============================================

  async scheduleReviewPublish(commandeId: string, delayMs: number): Promise<void> {
    await this.reviewQueue.add('review-publish', { commandeId }, {
      delay: delayMs,
      jobId: `review-publish:${commandeId}`,
      removeOnFail: 50,
    });
  }

  // ============================================
  // Message cleanup
  // ============================================

  async scheduleMessageCleanup(): Promise<void> {
    await this.messageCleanupQueue.add('cleanup', {}, {
      jobId: 'cleanup:messages',
      repeat: { cron: '0 0 * * 0' }, // Weekly
      removeOnFail: 50,
    });
  }
}
