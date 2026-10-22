<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-6xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Listes</h1>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterType" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous</option>
          <option value="vente">Ventes</option>
          <option value="demande">Demandes</option>
        </select>
        <select v-model="filterStatut" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="EN_PAUSE">En pause</option>
          <option value="SUSPENDU">Suspendu</option>
          <option value="VENDU">Vendu</option>
          <option value="OUVERTE">Ouverte</option>
          <option value="CLOTUREE">Clôturée</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="listings.length" class="space-y-3">
        <div
          v-for="listing in listings"
          :key="listing.id"
          class="card p-4 flex items-start justify-between gap-4"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium">{{ listing.titre }}</span>
              <StatusBadge
                :status="listing.statut"
                :variant="listingType(listing) === 'vente' ? 'vente' : 'demande'"
              />
            </div>
            <div class="text-sm text-gray-600">
              {{ listing.vendeur?.prenom || listing.acheteur?.prenom }} {{ listing.vendeur?.nom || listing.acheteur?.nom }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ listingType(listing) === 'vente' ? 'Vente' : 'Demande' }} ·
              Créé le {{ formatDate(listing.createdAt) }}
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <NuxtLink
              :to="`/${listingType(listing) === 'vente' ? 'ventes' : 'demandes'}/${listing.id}`"
              class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              Voir
            </NuxtLink>
            <button
              v-if="listing.statut !== 'SUSPENDU'"
              @click="handleSuspendListing(listing.id)"
              class="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
            >
              Suspendre
            </button>
            <button
              v-else
              @click="handleUnsuspendListing(listing.id)"
              class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Réactiver
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucune annonce trouvée.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnnonceVente, AnnonceDemande } from '~/types';
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Listes — Layerly');

const { suspendListing: adminSuspendListing, unsuspendListing: adminUnsuspendListing } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const listings = ref<(AnnonceVente | AnnonceDemande)[]>([]);
const loading = ref(true);
const filterType = ref('');
const filterStatut = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    // Fetch both ventes and demandes
    const config = useRuntimeConfig();
    const [ventes, demandes] = await Promise.all([
      $fetch(`${config.public.apiBase}/ventes`, { credentials: 'include' }),
      $fetch(`${config.public.apiBase}/demandes`, { credentials: 'include' }),
    ]);
    listings.value = [
      ...(Array.isArray(ventes?.listings || ventes) ? ventes.listings || ventes : []),
      ...(Array.isArray(demandes?.demandes || demandes) ? demandes.demandes || demandes : []),
    ];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

function listingType(listing: any): 'vente' | 'demande' {
  return listing.vendeurId ? 'vente' : 'demande';
}

async function handleSuspendListing(id: string) {
  const listing = listings.value.find((l: any) => l.id === id);
  try {
    await adminSuspendListing(accessToken.value, id, listingType(listing) || 'vente');
    showToast('Annonce suspendue', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

async function handleUnsuspendListing(id: string) {
  const listing = listings.value.find((l: any) => l.id === id);
  try {
    await adminUnsuspendListing(accessToken.value, id, listingType(listing) || 'vente');
    showToast('Annonce réactivée', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
