import type {
  AnnonceDemande,
  CreateDemandeDto,
  Devis,
  ImprimeurProfil,
} from '~/types';

export interface PaginatedDemandes {
  requests: Omit<AnnonceDemande, 'acheteur'>[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export function useDemandeService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function create(
    token: string | null,
    dto: CreateDemandeDto
  ): Promise<AnnonceDemande> {
    return $fetch(`${apiBase}/demandes`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function findById(id: string): Promise<AnnonceDemande> {
    return $fetch(`${apiBase}/demandes/${id}`, {
      credentials: 'include',
    });
  }

  async function findAll(params: {
    materiau?: string;
    tri?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedDemandes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch<PaginatedDemandes>(`${apiBase}/demandes?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function findByBuyer(
    buyerId: string,
    params: { statut?: string; limit?: number; offset?: number }
  ): Promise<PaginatedDemandes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch<PaginatedDemandes>(`${apiBase}/demandes/buyer/${buyerId}?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function update(
    token: string | null,
    id: string,
    dto: Partial<CreateDemandeDto>
  ): Promise<AnnonceDemande> {
    return $fetch(`${apiBase}/demandes/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function remove(token: string | null, id: string): Promise<void> {
    await $fetch(`${apiBase}/demandes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function search(
    query: string,
    params: { materiau?: string; limit?: number }
  ): Promise<Omit<AnnonceDemande, 'acheteur'>[]> {
    const searchParams = new URLSearchParams({ q: query });
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/demandes/search?${searchParams}`, {
      credentials: 'include',
    });
  }

  return {
    create,
    findById,
    findAll,
    findByBuyer,
    update,
    remove,
    search,
  };
}

export function useDevisService() {
  async function getQuotesForDemande(demandeId: string): Promise<Devis[]> {
    return $fetch(`${apiBase}/devis/demande/${demandeId}`, {
      credentials: 'include',
    });
  }

  async function submitQuote(
    token: string | null,
    demandeId: string,
    dto: {
      prixProduit: number;
      fraisLivraison: number;
      delaiJours: number;
      materiauPropose: string;
      couleurProposee: string;
      message?: string;
    }
  ): Promise<Devis> {
    return $fetch(`${apiBase}/devis/demande/${demandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function getMyQuotes(
    token: string | null,
    params: { role?: 'expediteur' | 'destinataire'; statut?: string }
  ): Promise<Devis[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/devis/my?${searchParams}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function acceptQuote(token: string | null, id: string): Promise<Devis> {
    return $fetch(`${apiBase}/devis/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function declineQuote(token: string | null, id: string): Promise<Devis> {
    return $fetch(`${apiBase}/devis/${id}/decline`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function findById(id: string): Promise<Devis> {
    return $fetch(`${apiBase}/devis/${id}`, {
      credentials: 'include',
    });
  }

  async function getAvailableImprimeurs(demandeId: string): Promise<ImprimeurProfil[]> {
    return $fetch(`${apiBase}/devis/demande/${demandeId}/imprimeurs`, {
      credentials: 'include',
    });
  }

  async function getMy(token: string | null): Promise<Devis[]> {
    return $fetch(`${apiBase}/devis/my`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function acceptQuote(token: string | null, id: string): Promise<Devis> {
    return $fetch(`${apiBase}/devis/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function declineQuote(token: string | null, id: string): Promise<Devis> {
    return $fetch(`${apiBase}/devis/${id}/decline`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    getQuotesForDemande,
    submitQuote,
    getMyQuotes,
    getMy,
    acceptQuote,
    declineQuote,
    findById,
    getAvailableImprimeurs,
  };
}
