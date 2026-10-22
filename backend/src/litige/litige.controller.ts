import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LitigeService } from './litige.service';
import { MotifLitige } from '../generated/prisma';

@Controller('litiges')
@UseGuards(JwtAuthGuard)
export class LitigeController {
  constructor(private readonly litigeService: LitigeService) {}

  // Open a dispute on a commande
  @Post('commande/:commandeId')
  async openDispute(
    @Param('commandeId', new ParseUUIDPipe()) commandeId: string,
    @CurrentUser('id') userId: string,
    @Body('motif') motif: MotifLitige,
    @Body('description') description: string,
    @Body('photos') photos?: string[],
  ) {
    return this.litigeService.openDispute(userId, commandeId, motif, description, photos || []);
  }

  // Seller response to a dispute
  @Post(':id/response')
  async respondToDispute(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
    @Body('reponse') reponse: string,
  ) {
    return this.litigeService.respondToDispute(id, userId, reponse);
  }

  // Get dispute by ID
  @Get(':id')
  async getDispute(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.litigeService.findById(id);
  }

  // Get user's disputes
  @Get('my')
  async getMyDisputes(@CurrentUser('id') userId: string) {
    return this.litigeService.findByUser(userId);
  }

  // Admin arbitration
  @Post(':id/arbitrer')
  async arbitrer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') adminId: string,
    @Body('decision') decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    @Body('montantRembourse') montantRembourse?: number,
    @Body('noteAdmin') noteAdmin?: string,
  ) {
    return this.litigeService.arbitrate(id, decision, montantRembourse || 0, noteAdmin || '', adminId);
  }
}
