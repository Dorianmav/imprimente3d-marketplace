import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, StorageBucket } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { SocketGateway } from './socket.gateway';
import { WorkersService } from '../workers/workers.service';

/**
 * Report DTO
 */
export interface ReportDto {
  cibleType: string;
  cibleId: string;
  motif: string;
  description: string;
  conversationId?: string;
}

/**
 * Block DTO
 */
export interface BlockDto {
  blockedId: string;
  reason?: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly MESSAGE_MAX_LENGTH: number;
  private readonly MAX_ATTACHMENTS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly socketGateway?: SocketGateway,
    private readonly workersService?: WorkersService,
  ) {
    this.MESSAGE_MAX_LENGTH = this.configService.get('MESSAGE_MAX_LENGTH', 2000);
  }

  // ============================================
  // T-7.1: Get user's conversations
  // ============================================

  async getUserConversations(userId: string, limit: number, offset: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { initiateurId: userId },
          { destinataireId: userId },
        ],
      },
      include: {
        participants: {
          where: { userId },
          select: { dernierLuAt: true, archivee: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            contenu: true,
            type: true,
            createdAt: true,
            expediteur: {
              select: { id: true, nom: true, prenom: true, avatar: true },
            },
          },
        },
        initiateur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        destinataire: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return { conversations, limit, offset };
  }

  // ============================================
  // T-7.2: Get conversation details
  // ============================================

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        initiateur: {
          select: { id: true, nom: true, prenom: true, avatar: true, noteMoyenne: true },
        },
        destinataire: {
          select: { id: true, nom: true, prenom: true, avatar: true, noteMoyenne: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            expediteur: {
              select: { id: true, nom: true, prenom: true, avatar: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is a participant
    if (conversation.initiateurId !== userId && conversation.destinataireId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Mark as read
    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { dernierLuAt: new Date() },
    });

    return conversation;
  }

  // ============================================
  // T-7.3: Send message
  // ============================================

  async sendMessage(
    conversationId: string,
    userId: string,
    contenu: string,
    type: any = 'TEXTE',
    offreId?: string,
    piecesJointes: string[] = [],
  ) {
    // Verify conversation exists and user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { select: { userId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Validate message length
    if (contenu.length > this.MESSAGE_MAX_LENGTH) {
      throw new ConflictException(`Message exceeds maximum length of ${this.MESSAGE_MAX_LENGTH}`);
    }

    // Validate attachments count
    if (piecesJointes.length > this.MAX_ATTACHMENTS) {
      throw new ConflictException(`Maximum ${this.MAX_ATTACHMENTS} attachments allowed`);
    }

    // Check if user is blocked by conversation partner
    const partnerId = conversation.initiateurId === userId
      ? conversation.destinataireId
      : conversation.initiateurId;

    const isBlocked = await this.prisma.userBlock.findFirst({
      where: {
        blockerId: partnerId,
        blockedId: userId,
      },
    });

    if (isBlocked) {
      throw new ForbiddenException('You cannot message this user');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        expediteurId: userId,
        type,
        contenu,
        offreId,
        piecesJointes,
      },
      include: {
        expediteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
    });

    this.logger.log(`Message sent in conversation ${conversationId} by user ${userId}`);

    // Broadcast real-time (CDC §13.1: notification en temps réel)
    if (this.socketGateway) {
      this.socketGateway.broadcastMessage({
        id: message.id,
        conversationId,
        contenu: message.contenu,
        type: message.type,
        piecesJointes: message.piecesJointes,
        offreId: message.offreId,
        expediteur: message.expediteur,
        createdAt: message.createdAt,
      });
      this.socketGateway.broadcastConversationUpdate(conversationId, {
        id: message.id,
        contenu: message.contenu,
        type: message.type,
        expediteur: message.expediteur,
        createdAt: message.createdAt,
      });
    }

    return message;
  }

  // ============================================
  // T-7.4: Get conversation messages
  // ============================================

  async getMessages(conversationId: string, userId: string, limit: number, before?: string) {
    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const where: Record<string, unknown> = { conversationId };
    if (before) {
      // Get messages before the given timestamp
      const beforeMsg = await this.prisma.message.findUnique({ where: { id: before } });
      if (beforeMsg) {
        where.createdAt = { lt: beforeMsg.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        expediteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 to check if there are more
    });

    const hasMore = messages.length > limit;
    return {
      messages: messages.slice(0, limit),
      hasMore,
    };
  }

  // ============================================
  // T-7.5: Send offer in conversation
  // ============================================

  async sendOffer(
    conversationId: string,
    userId: string,
    montant: number,
    fraisLivraison: number,
    annonceVenteId?: string,
    parentOffreId?: string,
    expireAtStr?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const expireAt = expireAtStr ? new Date(expireAtStr) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Find the other participant
    const otherUserId = conversation.participants.find((p) => p.userId !== userId)?.userId;
    if (!otherUserId) {
      throw new ForbiddenException('Cannot send offer to yourself');
    }

    const offre = await this.prisma.offreMessagerie.create({
      data: {
        conversationId,
        expediteurId: userId,
        destinataireId: otherUserId,
        montant,
        fraisLivraison,
        annonceVenteId,
        parentOffreId,
        statut: 'EN_ATTENTE',
        expireAt,
      },
    });

    // Ensure the periodic offer expiration check is scheduled (idempotent via jobId)
    if (this.workersService) {
      await this.workersService.checkOffreExpiration();
    }

    return offre;
  }

  // ============================================
  // T-7.6: Accept / decline offer
  // ============================================

  async acceptOffer(offerId: string, userId: string) {
    const offre = await this.prisma.offreMessagerie.findUnique({
      where: { id: offerId },
    });

    if (!offre) {
      throw new NotFoundException('Offer not found');
    }

    if (offre.destinataireId !== userId) {
      throw new ForbiddenException('Only the recipient can accept this offer');
    }

    if (offre.statut !== 'EN_ATTENTE') {
      throw new ConflictException('Offer is no longer pending');
    }

    if (offre.expireAt < new Date()) {
      throw new ConflictException('Offer has expired');
    }

    return this.prisma.offreMessagerie.update({
      where: { id: offerId },
      data: { statut: 'ACCEPTEE' },
    });
  }

  async declineOffer(offerId: string, userId: string) {
    const offre = await this.prisma.offreMessagerie.findUnique({
      where: { id: offerId },
    });

    if (!offre) {
      throw new NotFoundException('Offer not found');
    }

    if (offre.destinataireId !== userId) {
      throw new ForbiddenException('Only the recipient can decline this offer');
    }

    return this.prisma.offreMessagerie.update({
      where: { id: offerId },
      data: { statut: 'REFUSEE' },
    });
  }

  // ============================================
  // T-7.7: Report message / user
  // ============================================

  async report(userId: string, dto: ReportDto) {
    const report = await this.prisma.signalement.create({
      data: {
        reporterId: userId,
        cibleType: dto.cibleType as any,
        cibleId: dto.cibleId,
        conversationId: dto.conversationId || undefined,
        motif: dto.motif as any,
        description: dto.description,
        statut: 'OUVERT',
      },
    });

    this.logger.warn(`Report filed by user ${userId}: ${dto.motif} on ${dto.cibleType} ${dto.cibleId}`);

    return report;
  }

  // ============================================
  // T-7.8: Block user
  // ============================================

  async blockUser(userId: string, dto: BlockDto) {
    return this.prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: dto.blockedId,
      },
    });
  }

  async unblockUser(userId: string, blockedId: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: { blockerId: userId, blockedId: blockedId },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.userBlock.delete({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedId,
        },
      },
    });

    return { message: 'User unblocked' };
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }
}
