import type { Commande } from '~/types';

export interface PaginatedCommandes {
  commandes: Commande[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export function useCommandeService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function create(
    token: string | null,
    dto: {
      sourceType: string;
      sourceId: string;
      quantite?: number;
      modeLivraison: string;
      adresseLivraison?: unknown;
    }
  ): Promise<Commande> {
    return $fetch(`${apiBase}/commandes`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function getMyOrders(
    token: string | null,
    params: { role?: 'acheteur' | 'vendeur'; statut?: string }
  ): Promise<PaginatedCommandes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/commandes/my?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function findById(token: string | null, id: string): Promise<Commande> {
    return $fetch(`${apiBase}/commandes/${id}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function confirmPayment(
    token: string | null,
    id: string,
    stripePaymentIntentId: string
  ): Promise<Commande> {
    return $fetch(`${apiBase}/commandes/${id}/confirm-payment`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { stripePaymentIntentId },
    });
  }

  async function shipOrder(
    token: string | null,
    id: string,
    trackingInfo: string
  ): Promise<Commande> {
    return $fetch(`${apiBase}/commandes/${id}/ship`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { trackingInfo },
    });
  }

  async function confirmReceipt(token: string | null, id: string): Promise<Commande> {
    return $fetch(`${apiBase}/commandes/${id}/confirm-receipt`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function cancelOrder(
    token: string | null,
    id: string,
    motif?: string
  ): Promise<Commande> {
    return $fetch(`${apiBase}/commandes/${id}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { motif },
    });
  }

  async function listAdmin(
    params: { statut?: string; limit?: number; offset?: number }
  ): Promise<PaginatedCommandes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/commandes?${searchParams}`, {
      credentials: 'include',
    });
  }

  return {
    create,
    getMyOrders,
    findById,
    confirmPayment,
    shipOrder,
    confirmReceipt,
    cancelOrder,
    listAdmin,
  };
}
