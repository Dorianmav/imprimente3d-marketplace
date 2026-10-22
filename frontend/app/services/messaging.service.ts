import type { Conversation, Message, OffreMessagerie } from '~/types';

export function useMessagingService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function getConversations(
    token: string | null,
    params: { limit?: number; offset?: number }
  ): Promise<Conversation[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/messaging/conversations?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getConversation(
    token: string | null,
    id: string
  ): Promise<Conversation> {
    return $fetch(`${apiBase}/messaging/conversations/${id}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getMessages(
    token: string | null,
    conversationId: string,
    params: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/messaging/conversations/${conversationId}/messages?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function sendMessage(
    token: string | null,
    conversationId: string,
    contenu: string,
    type = 'TEXTE',
    offreId?: string,
    piecesJointes?: string[]
  ): Promise<Message> {
    return $fetch(`${apiBase}/messaging/conversations/${conversationId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { contenu, type, offreId, piecesJointes },
    });
  }

  async function sendOffer(
    token: string | null,
    conversationId: string,
    montant: number,
    fraisLivraison: number,
    params?: {
      annonceVenteId?: string;
      parentOffreId?: string;
      expireAt?: string;
    }
  ): Promise<OffreMessagerie> {
    return $fetch(`${apiBase}/messaging/conversations/${conversationId}/offers`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { montant, fraisLivraison, ...params },
    });
  }

  async function acceptOffer(token: string | null, offerId: string): Promise<OffreMessagerie> {
    return $fetch(`${apiBase}/messaging/offers/${offerId}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function declineOffer(token: string | null, offerId: string): Promise<OffreMessagerie> {
    return $fetch(`${apiBase}/messaging/offers/${offerId}/decline`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function report(
    token: string | null,
    cibleType: string,
    cibleId: string,
    motif: string,
    description: string,
    conversationId?: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/messaging/report`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { cibleType, cibleId, motif, description, conversationId },
    });
  }

  async function blockUser(
    token: string | null,
    blockedId: string,
    reason?: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/messaging/block`, {
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
    return $fetch(`${apiBase}/messaging/block/${blockedId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getBlockedUsers(token: string | null): Promise<unknown[]> {
    return $fetch(`${apiBase}/messaging/blocked`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    getConversations,
    getConversation,
    getMessages,
    sendMessage,
    sendOffer,
    acceptOffer,
    declineOffer,
    report,
    blockUser,
    unblockUser,
    getBlockedUsers,
  };
}
