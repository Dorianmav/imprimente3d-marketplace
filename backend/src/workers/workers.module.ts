import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkersService } from './workers.service';
import { CheckoutExpirationWorker } from './workers/checkout-expiration.worker';
import { OrderExpirationWorker } from './workers/order-expiration.worker';
import { VacationModeWorker } from './workers/vacation-mode.worker';
import { DisputeWorker } from './workers/dispute.worker';
import { ReviewWorker } from './workers/review-worker';
import { MessageCleanupWorker } from './workers/message-cleanup.worker';

const WORKERS = [
  CheckoutExpirationWorker,
  OrderExpirationWorker,
  VacationModeWorker,
  DisputeWorker,
  ReviewWorker,
  MessageCleanupWorker,
];

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ...WORKERS.map((Worker) =>
      BullModule.registerQueue({
        name: Worker.prototype['queueName'] || 'default',
      }),
    ),
  ],
  providers: [WorkersService, ...WORKERS],
  exports: [WorkersService],
})
export class WorkersModule {}
