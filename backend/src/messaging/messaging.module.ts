import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { SocketGateway } from './socket.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { JwtModule } from '@nestjs/jwt';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JwtModule.register({ global: true }),
    WorkersModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, SocketGateway],
  exports: [MessagingService, SocketGateway],
})
export class MessagingModule {}
