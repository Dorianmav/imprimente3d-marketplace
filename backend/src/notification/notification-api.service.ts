import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * In-app notification (stored in-memory + file-based persistence).
 * Uses local JSON file per user as fallback (no schema migration needed).
 * Structure: { id, userId, event, title, body, data, read, createdAt }
 */
export interface UserNotification {
  id: string;
  userId: string;
  event: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

const NOTIFICATION_PREFS_KEY = 'notificationPrefs';
const NOTIFICATIONS_KEY = 'notifications';
const STORAGE_DIR = path.join(process.cwd(), '.notification-store');

/**
 * File-based notification store (no DB migration required).
 * In production, replace with a real Notification table.
 */
@Injectable()
export class NotificationApiService implements OnModuleInit {
  private readonly logger = new Logger(NotificationApiService.name);
  private readonly prefs = new Map<string, Record<string, unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Create storage directory
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Get notifications for a user (paginated, optional unread filter)
   */
  async getNotifications(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly: boolean,
  ) {
    this.ensureUser(userId);

    const notifications = this.readNotifications(userId);

    const filtered = unreadOnly
      ? notifications.filter((n) => !n.read)
      : notifications;

    // Sort by createdAt desc
    filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    return { notifications: page, total, limit, offset };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    this.ensureUser(userId);

    const notifications = this.readNotifications(userId);
    const found = notifications.find((n) => n.id === notificationId);

    if (!found) {
      throw new NotFoundException('Notification non trouvée');
    }

    found.read = true;
    this.writeNotifications(userId, notifications);

    return { message: 'Notification marquée comme lue' };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    this.ensureUser(userId);

    const notifications = this.readNotifications(userId);
    notifications.forEach((n) => { n.read = true; });
    this.writeNotifications(userId, notifications);

    return { message: `${notifications.length} notifications marquées comme lues` };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    this.ensureUser(userId);

    const notifications = this.readNotifications(userId);
    const idx = notifications.findIndex((n) => n.id === notificationId);

    if (idx === -1) {
      throw new NotFoundException('Notification non trouvée');
    }

    notifications.splice(idx, 1);
    this.writeNotifications(userId, notifications);

    return { message: 'Notification supprimée' };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    this.ensureUser(userId);

    const notifications = this.readNotifications(userId);
    const unread = notifications.filter((n) => !n.read).length;
    return { unreadCount: unread };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, events: Record<string, boolean>) {
    this.ensureUser(userId);

    const prefs = { ...this.readPrefs(userId), ...events };
    this.writePrefs(userId, prefs);

    return { preferences: prefs };
  }

  /**
   * Push a notification for a user (called by NotificationService or workers)
   */
  async pushNotification(payload: {
    userId: string;
    event: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    this.ensureUser(payload.userId);

    const notification: UserNotification = {
      id: randomUUID(),
      userId: payload.userId,
      event: payload.event,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      read: false,
      createdAt: new Date(),
    };

    const current = this.readNotifications(payload.userId);
    current.unshift(notification);

    // Keep only last 50 notifications
    while (current.length > 50) {
      current.pop();
    }

    this.writeNotifications(payload.userId, current);
  }

  // ========================
  // Internal helpers
  // ========================

  private ensureUser(userId: string) {
    if (!this.prefs.has(userId)) {
      this.prefs.set(userId, {});
    }
  }

  private readNotifications(userId: string): UserNotification[] {
    const file = path.join(STORAGE_DIR, `${userId}.json`);
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      return (data[NOTIFICATIONS_KEY] || []) as UserNotification[];
    } catch {
      return [];
    }
  }

  private writeNotifications(userId: string, notifications: UserNotification[]) {
    const file = path.join(STORAGE_DIR, `${userId}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf-8') || '{}');
    data[NOTIFICATIONS_KEY] = notifications;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  private readPrefs(userId: string): Record<string, unknown> {
    return (this.prefs.get(userId) as Record<string, unknown>) || {};
  }

  private writePrefs(userId: string, prefs: Record<string, unknown>) {
    this.prefs.set(userId, prefs);
  }
}
