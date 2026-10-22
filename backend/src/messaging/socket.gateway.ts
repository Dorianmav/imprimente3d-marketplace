import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { ConfigService } from '@nestjs/config';

/**
 * Socket.io gateway for real-time messaging
 * - Joins clients to conversation rooms
 * - Forwards messages in real-time
 * - Handles typing indicators and read receipts
 */
@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins in dev; restrict in production
    credentials: true,
  },
  namespace: 'socket',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private readonly redisHost: string;
  private readonly redisPort: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly configService: ConfigService,
  ) {
    this.redisHost = this.configService.get('REDIS_HOST', 'localhost');
    this.redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'), 10);
  }

  /**
   * Handle new client connection — authenticate via query param token
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET', 'fallback-secret'),
      });

      // Attach user info to socket data
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      this.logger.log(`Client connected: ${client.id} (user: ${payload.email})`);
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error.stack);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string;

    // Verify user is part of the conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });

    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    if (!conversation.participants.some((p) => p.userId === userId)) {
      return { error: 'You are not part of this conversation' };
    }

    client.join(`conversation:${conversationId}`);
    return { success: true, conversationId };
  }

  /**
   * Send a real-time message (fires after DB save in messaging service)
   */
  broadcastMessage(message: any) {
    this.server
      .to(`conversation:${message.conversationId}`)
      .emit('newMessage', message);
  }

  /**
   * Broadcast typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string;

    this.server
      .to(`conversation:${data.conversationId}`)
      .except(client.id)
      .emit('typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
  }

  /**
   * Mark messages as read (real-time)
   */
  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string;

    this.server
      .to(`conversation:${data.conversationId}`)
      .except(client.id)
      .emit('messagesRead', {
        userId,
        conversationId: data.conversationId,
        timestamp: new Date(),
      });
  }

  /**
   * Broadcast that a conversation has a new last message (for sidebar update)
   */
  broadcastConversationUpdate(conversationId: string, lastMessage: any) {
    // Notify all participants across all their connected sockets
    this.server.to(`conversation:${conversationId}`).emit('conversationUpdate', {
      conversationId,
      lastMessage,
      updatedAt: new Date(),
    });
  }
}
