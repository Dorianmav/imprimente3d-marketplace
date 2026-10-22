import type { User, AnnonceDemande, PaginatedResult } from '~/types';
import { useVenteService } from '~/services/vente.service';
import { useDemandeService } from '~/services/demande.service';
import { useSearchService } from '~/services/search.service';

/**
 * Pinia store for listings (ventes + demandes)
 * Handles caching, pagination, and filtering
 */
export const useListingsStore = defineStore('listings', () => {
  const ventes = useState<AnnonceVente[]>('listings.ventes', () => []);
  const ventesMeta = useState<{ total: number; hasMore: boolean } | null>('listings.ventes.meta', () => null);
  const demandes = useState<AnnonceDemande[]>('listings.demandes', () => []);
  const demandesMeta = useState<{ total: number; hasMore: boolean } | null>('listings.demandes.meta', () => null);
  const selectedVente = useState<AnnonceVente | null>('listings.selectedVente', () => null);
  const selectedDemande = useState<AnnonceDemande | null>('listings.selectedDemande', () => null);
  const loading = useState<boolean>('listings.loading', () => false);
  const error = useState<string | null>('listings.error', () => null);

  const venteService = useVenteService();
  const demandeService = useDemandeService();
  const searchService = useSearchService();
  const { accessToken } = useAuth();

  // Fetch all active ventes (marketplace feed)
  async function fetchVentes(params: {
    categorie?: string;
    materiau?: string;
    tri?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const result = await venteService.findAll({
        ...params,
        limit: params.limit ?? 20,
      });
      // Backend returns { listings, total, ...params }
      ventes.value = result.listings as unknown as AnnonceVente[];
      ventesMeta.value = {
        total: result.total,
        hasMore: result.offset ? (result.offset + result.listings.length < result.total) : false,
      };
      return result;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch listings';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch demandes
  async function fetchDemandes(params: {
    materiau?: string;
    tri?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const result = await demandeService.findAll({
        ...params,
        limit: params.limit ?? 20,
      });
      demandes.value = result.requests as unknown as AnnonceDemande[];
      demandesMeta.value = {
        total: result.total,
        hasMore: result.offset ? (result.offset + result.requests.length < result.total) : false,
      };
      return result;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch requests';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch a single vente
  async function fetchVente(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const vente = await venteService.findById(id);
      selectedVente.value = vente;
      return vente;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch listing';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch a single demande
  async function fetchDemande(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const demande = await demandeService.findById(id);
      selectedDemande.value = demande;
      return demande;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch request';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Search
  async function search(query: string, filters: {
    type?: string;
    materiau?: string;
    categorie?: string;
    minPrice?: number;
    maxPrice?: number;
  } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const result = await searchService.search({ q: query, ...filters });
      return result;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Search failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch ventes by seller
  async function getSellerVentes(
    sellerId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResult<AnnonceVente>> {
    loading.value = true;
    error.value = null;
    try {
      const result = await venteService.findAll({
        ...params,
        limit: params.limit ?? 10,
      });
      // Filter by seller on client side since backend doesn't support seller filter
      const filtered = result.listings.filter(
        (v: any) => v.vendeurId === sellerId
      ) as unknown as AnnonceVente[];
      return {
        data: filtered,
        total: filtered.length,
        limit: result.limit,
        offset: result.offset,
        hasMore: false,
      };
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch seller listings';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch demandes by buyer
  async function getBuyerDemandes(
    buyerId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResult<AnnonceDemande>> {
    loading.value = true;
    error.value = null;
    try {
      const result = await demandeService.findByBuyer(buyerId, params);
      // Filter on client side since backend may return all demandes
      const filtered = result.requests as unknown as AnnonceDemande[];
      return {
        data: filtered,
        total: filtered.length,
        limit: result.limit,
        offset: result.offset,
        hasMore: false,
      };
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch buyer demandes';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Reset
  function resetSelection() {
    selectedVente.value = null;
    selectedDemande.value = null;
  }

  return {
    ventes,
    ventesMeta,
    demandes,
    demandesMeta,
    selectedVente,
    selectedDemande,
    loading,
    error,
    fetchVentes,
    fetchDemandes,
    fetchVente,
    fetchDemande,
    search,
    getSellerVentes,
    getBuyerDemandes,
    resetSelection,
  };
});
