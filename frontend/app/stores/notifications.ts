/**
 * Pinia store for notifications
 */
import { useNotificationService } from '~/services/notification.service';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = useState<Notification[]>('notifications.list', () => []);
  const unreadCount = useState<number>('notifications.unreadCount', () => 0);
  const totalUnread = useState<number>('notifications.totalUnread', () => 0);
  const loading = useState<boolean>('notifications.loading', () => false);

  const service = useNotificationService();
  const { accessToken } = useAuth();

  async function fetchNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    loading.value = true;
    try {
      if (!accessToken.value) return;
      const result = await service.getNotifications(accessToken.value, params ?? {});
      notifications.value = result.notifications;
      totalUnread.value = result.total;
      unreadCount.value = result.notifications.filter(n => !n.read).length;
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    if (!accessToken.value) return;
    const { count } = await service.getUnreadCount(accessToken.value);
    unreadCount.value = count;
    totalUnread.value = count;
  }

  async function markAsRead(id: string) {
    if (!accessToken.value) return;
    await service.markAsRead(accessToken.value, id);
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications.value[idx] = { ...notifications.value[idx], read: true };
    }
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    totalUnread.value = Math.max(0, totalUnread.value - 1);
  }

  async function markAllAsRead() {
    if (!accessToken.value) return;
    await service.markAllAsRead(accessToken.value);
    notifications.value.forEach(n => (n.read = true));
    unreadCount.value = 0;
  }

  async function refresh() {
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount(),
    ]);
  }

  return {
    notifications,
    unreadCount,
    totalUnread,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  };
});
