import type { AnnonceVente, AnnonceDemande, SearchFilters } from '~/types';

export function useSearchService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  async function search(
    params: SearchFilters
  ): Promise<{
    ventes: AnnonceVente[];
    demandes: AnnonceDemande[];
    users: unknown[];
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '' && v !== 'all') searchParams.set(k, String(v));
    });
    return $fetch(`${apiBase}/search?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function autocomplete(
    query: string,
    type?: string,
    limit = 10
  ): Promise<unknown[]> {
    const searchParams = new URLSearchParams({ q: query, limit: String(limit) });
    if (type) searchParams.set('type', type);
    return $fetch(`${apiBase}/search/autocomplete?${searchParams}`, {
      credentials: 'include',
    });
  }

  async function getTrending(limit = 10): Promise<unknown[]> {
    return $fetch(`${apiBase}/search/trending?limit=${limit}`, {
      credentials: 'include',
    });
  }

  return {
    search,
    autocomplete,
    getTrending,
  };
}
