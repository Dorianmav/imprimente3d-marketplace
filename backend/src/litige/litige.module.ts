import { Module } from '@nestjs/common';
import { LitigeController } from './litige.controller';
import { LitigeService } from './litige.service';
import { NotificationModule } from '../notification/notification.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  controllers: [LitigeController],
  providers: [LitigeService],
  imports: [NotificationModule, WorkersModule],
})
export class LitigeModule {}
