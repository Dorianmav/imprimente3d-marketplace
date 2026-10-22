import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationApiController } from './notification-api.controller';
import { NotificationApiService } from './notification-api.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationApiController],
  providers: [NotificationService, NotificationApiService],
  exports: [NotificationService, NotificationApiService],
})
export class NotificationModule {}
