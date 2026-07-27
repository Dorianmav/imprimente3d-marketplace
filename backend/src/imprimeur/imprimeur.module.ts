import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ImprimeurController } from './imprimeur.controller';
import { ImprimeurService } from './imprimeur.service';
import { RequireStripeCompleteGuard } from './guards/require-stripe-complete.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ImprimeurController],
  providers: [ImprimeurService, RequireStripeCompleteGuard],
  exports: [ImprimeurService],
})
export class ImprimeurModule {}