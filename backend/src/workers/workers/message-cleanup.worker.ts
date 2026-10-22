import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('message-cleanup')
export class MessageCleanupWorker extends WorkerHost {
  private readonly logger = new Logger(MessageCleanupWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'cleanup') {
      return this.handleMessageCleanup();
    }
  }

  async handleMessageCleanup() {
    // Delete messages older than 24 months without activity
    // (except those involved in reports)
    const retentionMs = 24 * 30 * 24 * 60 * 60 * 1000; // ~24 months
    const cutoffDate = new Date(Date.now() - retentionMs);

    // Find conversations with no activity in 24 months
    const inactiveConversations = await this.prisma.conversation.findMany({
      where: {
        messages: {
          every: {
            createdAt: { lt: cutoffDate },
          },
        },
      },
      include: {
        signalements: { select: { id: true } },
      },
    });

    for (const conv of inactiveConversations) {
      // Skip if involved in a report
      if (conv.signalements.length > 0) {
        continue;
      }

      // Delete messages
      await this.prisma.message.deleteMany({
        where: { conversationId: conv.id },
      });

      // Delete conversation participants
      await this.prisma.conversationParticipant.deleteMany({
        where: { conversationId: conv.id },
      });

      // Delete conversation
      await this.prisma.conversation.delete({
        where: { id: conv.id },
      });

      this.logger.log(`Cleaned up inactive conversation ${conv.id}`);
    }
  }
}
