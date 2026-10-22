import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Query,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationApiService } from './notification-api.service';

/**
 * In-app notification API
 * - Stored as JSONB[] in User table (notificationPrefs field)
 * - Real-time updates via Socket.io namespace 'socket'
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationApiController {
  constructor(private readonly notificationApiService: NotificationApiService) {}

  // ============================================
  // Get user's notifications (paginated)
  // ============================================

  @Get()
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unread') unreadOnly?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.notificationApiService.getNotifications(
      userId,
      parsedLimit,
      parsedOffset,
      unreadOnly === 'true',
    );
  }

  // ============================================
  // Mark notification as read
  // ============================================

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationApiService.markAsRead(userId, notificationId);
  }

  // ============================================
  // Mark all as read
  // ============================================

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationApiService.markAllAsRead(userId);
  }

  // ============================================
  // Delete notification
  // ============================================

  @Delete(':id')
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationApiService.deleteNotification(userId, notificationId);
  }

  // ============================================
  // Get unread count
  // ============================================

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationApiService.getUnreadCount(userId);
  }

  // ============================================
  // Toggle notification preferences
  // ============================================

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body('events') events: Record<string, boolean>,
  ) {
    if (!events || typeof events !== 'object') {
      throw new BadRequestException('events must be an object');
    }
    return this.notificationApiService.updatePreferences(userId, events);
  }
}
