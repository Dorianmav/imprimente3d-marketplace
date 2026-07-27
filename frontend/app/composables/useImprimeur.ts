interface Imprimante {
  marque: string;
  modele: string;
  dimensionMaxX: number;
  dimensionMaxY: number;
  dimensionMaxZ: number;
}

interface ImprimeurProfil {
  userId: string;
  bio?: string;
  imprimantes: Imprimante[];
  materiaux: string[];
  zoneExpedition?: string;
  delaiMoyenJours: number;
  tarifsIndicatifs?: string;
  disponible: boolean;
}

export function useImprimeur() {
  const { accessToken } = useAuth();
  const config = useRuntimeConfig();

  function headers() {
    return { Authorization: `Bearer ${accessToken.value}` };
  }

  async function getMine() {
    return $fetch<ImprimeurProfil | null>(
      `${config.public.apiBase}/imprimeur-profil/me`,
      { credentials: "include", headers: headers() },
    );
  }

  async function createOrUpdate(payload: Partial<ImprimeurProfil>) {
    return $fetch<ImprimeurProfil>(`${config.public.apiBase}/imprimeur-profil`, {
      method: "POST",
      credentials: "include",
      headers: headers(),
      body: payload,
    });
  }

  async function toggleDisponible(disponible: boolean) {
    return $fetch<ImprimeurProfil>(
      `${config.public.apiBase}/imprimeur-profil/disponibilite`,
      {
        method: "PATCH",
        credentials: "include",
        headers: headers(),
        body: { disponible },
      },
    );
  }

  return { getMine, createOrUpdate, toggleDisponible };
}