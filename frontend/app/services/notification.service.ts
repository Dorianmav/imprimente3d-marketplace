import type { Notification } from '~/types';

export function useNotificationService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function getNotifications(
    token: string | null,
    params: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<{ notifications: Notification[]; total: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/notifications?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function markAsRead(token: string | null, id: string): Promise<{ message: string }> {
    return $fetch(`${apiBase}/notifications/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function markAllAsRead(token: string | null): Promise<{ message: string }> {
    return $fetch(`${apiBase}/notifications/read-all`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function deleteNotification(token: string | null, id: string): Promise<{ message: string }> {
    return $fetch(`${apiBase}/notifications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getUnreadCount(token: string | null): Promise<{ count: number }> {
    return $fetch(`${apiBase}/notifications/unread-count`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function updatePreferences(
    token: string | null,
    events: Record<string, boolean>
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/notifications/preferences`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { events },
    });
  }

  return {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    updatePreferences,
  };
}
