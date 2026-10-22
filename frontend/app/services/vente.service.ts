import type {
  AnnonceVente,
  CreateVenteDto,
} from '~/types';

export interface PaginatedVentes {
  listings: Omit<AnnonceVente, 'vendeur'>[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export function useVenteService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function create(token: string | null, dto: CreateVenteDto): Promise<AnnonceVente> {
    return $fetch(`${apiBase}/ventes`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function findById(id: string): Promise<AnnonceVente> {
    return $fetch(`${apiBase}/ventes/${id}`, {
      credentials: 'include',
    });
  }

  async function findAll(params: {
    categorie?: string;
    materiau?: string;
    tri?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedVentes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch<PaginatedVentes>(`${apiBase}/ventes?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function findBySeller(
    sellerId: string,
    params: { statut?: string; limit?: number; offset?: number }
  ): Promise<PaginatedVentes> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') searchParams.set(k, String(v));
    });
    return $fetch<PaginatedVentes>(`${apiBase}/ventes/seller/${sellerId}?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function update(
    token: string | null,
    id: string,
    dto: Partial<CreateVenteDto>
  ): Promise<AnnonceVente> {
    return $fetch(`${apiBase}/ventes/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: dto,
    });
  }

  async function remove(
    token: string | null,
    id: string
  ): Promise<void> {
    await $fetch(`${apiBase}/ventes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    create,
    findById,
    findAll,
    findBySeller,
    update,
    remove,
  };
}
