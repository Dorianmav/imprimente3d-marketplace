import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DevisService } from './devis.service';

@Controller('devis')
@UseGuards(JwtAuthGuard)
export class DevisController {
  constructor(private readonly devisService: DevisService) {}

  // ============================================
  // T-8.1: Get quotes for a request
  // ============================================

  @Get('demande/:demandeId')
  async getQuotesForDemande(
    @Param('demandeId', new ParseUUIDPipe()) demandeId: string,
  ) {
    return this.devisService.findByDemande(demandeId);
  }

  // ============================================
  // T-8.2: Submit a quote (imprimeur)
  // ============================================

  @Post('demande/:demandeId')
  async submitQuote(
    @Param('demandeId', new ParseUUIDPipe()) demandeId: string,
    @CurrentUser('id') userId: string,
    @Body() createDto: any,
  ) {
    return this.devisService.create(userId, demandeId, createDto);
  }

  // ============================================
  // T-8.3: Get user's quotes
  // ============================================

  @Get('my')
  async getMyQuotes(
    @CurrentUser('id') userId: string,
    @Query('role') role: 'expediteur' | 'destinataire' = 'expediteur',
    @Query('statut') statut?: string,
  ) {
    return this.devisService.findByUser(userId, role, statut);
  }

  // ============================================
  // T-8.4: Update quote status (accept/decline)
  // ============================================

  @Post(':id/accept')
  async acceptQuote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.devisService.accept(id, userId);
  }

  @Post(':id/decline')
  async declineQuote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.devisService.decline(id, userId);
  }

  // ============================================
  // T-8.5: Get quote by ID
  // ============================================

  @Get(':id')
  async getQuote(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.devisService.findById(id);
  }

  // ============================================
  // T-8.6: List available imprimeurs for a request
  // ============================================

  @Get('demande/:demandeId/imprimeurs')
  async getAvailableImprimeurs(
    @Param('demandeId', new ParseUUIDPipe()) demandeId: string,
  ) {
    return this.devisService.findAvailableImprimeurs(demandeId);
  }
}
