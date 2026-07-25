// stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeProvider } from './providers/stripe.provider';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StripeController } from './stripe.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [StripeProvider, StripeService],
  exports: [StripeService],
  controllers: [StripeController],
})
export class StripeModule {}