import type { Avis, User } from '~/types';

export function useAvisService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function create(
    token: string | null,
    commandeId: string,
    note: number,
    commentaire?: string
  ): Promise<Avis> {
    return $fetch(`${apiBase}/avis`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { commandeId, note, commentaire },
    });
  }

  async function getForUser(userId: string): Promise<Avis[]> {
    return $fetch(`${apiBase}/avis/user/${userId}`, {
      credentials: 'include',
    });
  }

  async function getMyGiven(token: string | null): Promise<Avis[]> {
    return $fetch(`${apiBase}/avis/my-given`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getReceived(token: string | null): Promise<Avis[]> {
    return $fetch(`${apiBase}/avis/received`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    create,
    getForUser,
    getMyGiven,
    getReceived,
  };
}

export function useUserService() {
  async function getProfile(token: string | null): Promise<User> {
    return $fetch(`${apiBase}/users/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function updateProfile(
    token: string | null,
    dto: { prenom?: string; nom?: string; avatarUrl?: string; localisation?: unknown }
  ): Promise<User> {
    return $fetch(`${apiBase}/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function getPublicProfile(userId: string): Promise<Omit<User, 'email'>> {
    return $fetch(`${apiBase}/users/${userId}`, {
      credentials: 'include',
    });
  }

  async function getUserReviews(userId: string): Promise<Avis[]> {
    return $fetch(`${apiBase}/users/${userId}/reviews`, {
      credentials: 'include',
    });
  }

  async function getUserListings(userId: string) {
    return $fetch(`${apiBase}/users/${userId}/listings`, {
      credentials: 'include',
    });
  }

  async function deleteAccount(token: string | null): Promise<{ message: string }> {
    return $fetch(`${apiBase}/users/me`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function blockUser(
    token: string | null,
    blockedId: string,
    reason?: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/users/me/block`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { blockedId, reason },
    });
  }

  async function unblockUser(
    token: string | null,
    blockedId: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/users/me/block/${blockedId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getBlockedUsers(token: string | null): Promise<User[]> {
    return $fetch(`${apiBase}/users/me/blocked`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function geocodeAddress(
    token: string | null,
    address: string
  ): Promise<{ message: string; latitude: number; longitude: number }> {
    return $fetch(`${apiBase}/users/me/geocode`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { address },
    });
  }

  return {
    getProfile,
    updateProfile,
    getPublicProfile,
    getUserReviews,
    getUserListings,
    deleteAccount,
    blockUser,
    unblockUser,
    getBlockedUsers,
    geocodeAddress,
  };
}
