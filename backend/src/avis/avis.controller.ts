import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AvisService } from './avis.service';

@Controller('avis')
@UseGuards(JwtAuthGuard)
export class AvisController {
  constructor(private readonly avisService: AvisService) {}

  // ============================================
  // T-9.1: Submit a review (after delivery)
  // ============================================

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body('commandeId') commandeId: string,
    @Body('note') note: number,
    @Body('commentaire') commentaire?: string,
  ) {
    if (!commandeId) {
      throw new BadRequestException('commandeId is required');
    }
    if (!note || note < 1 || note > 5) {
      throw new BadRequestException('note must be between 1 and 5');
    }
    if (commentaire && commentaire.length > 500) {
      throw new BadRequestException('commentaire must be at most 500 characters');
    }

    return this.avisService.create(userId, commandeId, note, commentaire);
  }

  // ============================================
  // T-9.2: Get reviews for a user (profile view)
  // ============================================

  @Get('user/:userId')
  async getForUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.avisService.findByCible(userId);
  }

  // ============================================
  // T-9.3: Get user's own reviews (given)
  // ============================================

  @Get('my-given')
  async getMyGivenReviews(@CurrentUser('id') userId: string) {
    return this.avisService.findByAuteur(userId);
  }
}
