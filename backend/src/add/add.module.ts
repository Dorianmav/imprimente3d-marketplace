import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddVenteController } from './add-vente.controller';
import { AddVenteService } from './add-vente.service';
import { AddDemandeController } from './add-demande.controller';
import { AddDemandeService } from './add-demande.service';
import { RequireImprimeurGuard } from './guards/require-imprimeur.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AddVenteController, AddDemandeController],
  providers: [AddVenteService, AddDemandeService, RequireImprimeurGuard],
  exports: [AddVenteService, AddDemandeService],
})
export class AddModule {}
