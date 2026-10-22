import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============================================
  // T-7.1: Get user's conversations
  // ============================================

  @Get('conversations')
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.messagingService.getUserConversations(userId, parsedLimit, parsedOffset);
  }

  // ============================================
  // T-7.2: Get conversation details
  // ============================================

  @Get('conversations/:id')
  async getConversation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagingService.getConversation(id, userId);
  }

  // ============================================
  // T-7.3: Send message
  // ============================================

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @CurrentUser('id') userId: string,
    @Body('contenu') contenu: string,
    @Body('type') type?: string,
    @Body('offreId') offreId?: string,
    @Body('piecesJointes') piecesJointes?: string[],
  ) {
    if (!contenu && !offreId && (!piecesJointes || piecesJointes.length === 0)) {
      throw new BadRequestException('Message must contain contenu, offreId, or piecesJointes');
    }
    return this.messagingService.sendMessage(
      conversationId,
      userId,
      contenu || '',
      (type as any) || 'TEXTE',
      offreId,
      piecesJointes || [],
    );
  }

  // ============================================
  // T-7.4: Get conversation messages (pagination)
  // ============================================

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.messagingService.getMessages(
      conversationId,
      userId,
      parsedLimit,
      before,
    );
  }

  // ============================================
  // T-7.5: Send offer in conversation
  // ============================================

  @Post('conversations/:id/offers')
  async sendOffer(
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @CurrentUser('id') userId: string,
    @Body('montant') montant: number,
    @Body('fraisLivraison') fraisLivraison: number,
    @Body('annonceVenteId') annonceVenteId?: string,
    @Body('parentOffreId') parentOffreId?: string,
    @Body('expireAt') expireAt?: string,
  ) {
    return this.messagingService.sendOffer(
      conversationId,
      userId,
      montant,
      fraisLivraison,
      annonceVenteId,
      parentOffreId,
      expireAt,
    );
  }

  // ============================================
  // T-7.6: Accept / decline offer
  // ============================================

  @Post('offers/:offerId/accept')
  async acceptOffer(
    @Param('offerId', new ParseUUIDPipe()) offerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagingService.acceptOffer(offerId, userId);
  }

  @Post('offers/:offerId/decline')
  async declineOffer(
    @Param('offerId', new ParseUUIDPipe()) offerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagingService.declineOffer(offerId, userId);
  }

  // ============================================
  // T-7.7: Report message / user
  // ============================================

  @Post('report')
  async report(
    @CurrentUser('id') userId: string,
    @Body('cibleType') cibleType: string,
    @Body('cibleId') cibleId: string,
    @Body('motif') motif: string,
    @Body('description') description: string,
    @Body('conversationId') conversationId?: string,
  ) {
    return this.messagingService.report(userId, {
      cibleType,
      cibleId,
      motif,
      description,
      conversationId,
    });
  }

  // ============================================
  // T-7.8: Block user
  // ============================================

  @Post('block')
  async blockUser(
    @CurrentUser('id') userId: string,
    @Body('blockedId') blockedId: string,
    @Body('reason') reason?: string,
  ) {
    return this.messagingService.blockUser(userId, { blockedId, reason });
  }

  @Delete('block/:blockedId')
  async unblockUser(
    @Param('blockedId', new ParseUUIDPipe()) blockedId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagingService.unblockUser(userId, blockedId);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser('id') userId: string) {
    return this.messagingService.getBlockedUsers(userId);
  }
}
