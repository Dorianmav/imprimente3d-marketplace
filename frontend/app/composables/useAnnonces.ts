interface AnnonceVente {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  materiau: string;
  couleur: string;
  photos: string[];
  prixProduit: number;
  modeLivraison: "ENVOI" | "MAIN_PROPRE" | "LES_DEUX";
  fraisLivraison: number;
  stock?: number;
  statut: string;
}

interface AnnonceDemande {
  id: string;
  titre: string;
  description?: string;
  fichier3d?: string;
  photosReference: string[];
  budgetMax?: number;
  materiauSouhaite?: string;
  couleurSouhaitee?: string;
  quantite: number;
  statut: string;
}

export function useAnnonces() {
  const { accessToken } = useAuth();
  const config = useRuntimeConfig();

  function headers() {
    return { Authorization: `Bearer ${accessToken.value}` };
  }

  async function createVente(payload: Partial<AnnonceVente>) {
    return $fetch<AnnonceVente>(`${config.public.apiBase}/add/vente`, {
      method: "POST",
      credentials: "include",
      headers: headers(),
      body: payload,
    });
  }

  async function updateVente(id: string, payload: Partial<AnnonceVente>) {
    return $fetch<AnnonceVente>(`${config.public.apiBase}/add/vente/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: headers(),
      body: payload,
    });
  }

  async function getVente(id: string) {
    return $fetch<AnnonceVente>(`${config.public.apiBase}/add/vente/${id}`, {
      credentials: "include",
    });
  }

  async function deleteVente(id: string) {
    return $fetch(`${config.public.apiBase}/add/vente/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: headers(),
    });
  }

  async function createDemande(payload: Partial<AnnonceDemande>) {
    return $fetch<AnnonceDemande>(`${config.public.apiBase}/add/demande`, {
      method: "POST",
      credentials: "include",
      headers: headers(),
      body: payload,
    });
  }

  async function updateDemande(id: string, payload: Partial<AnnonceDemande>) {
    return $fetch<AnnonceDemande>(`${config.public.apiBase}/add/demande/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: headers(),
      body: payload,
    });
  }

  async function getDemande(id: string) {
    return $fetch<AnnonceDemande>(`${config.public.apiBase}/add/demande/${id}`, {
      credentials: "include",
    });
  }

  async function deleteDemande(id: string) {
    return $fetch(`${config.public.apiBase}/add/demande/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: headers(),
    });
  }

  return {
    createVente,
    updateVente,
    getVente,
    deleteVente,
    createDemande,
    updateDemande,
    getDemande,
    deleteDemande,
  };
}