<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Profil</h1>

      <template v-if="profile">
        <!-- Profile header -->
        <div class="card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
          <UAvatar :src="profile.avatarUrl" :alt="profile.prenom" size="xl" />
          <div class="text-center sm:text-left">
            <h2 class="font-sora font-bold text-xl">
              {{ profile.prenom }} {{ profile.nom }}
            </h2>
            <div class="text-sm text-gray-500 mb-2">
              {{ formatTypeCompte(profile.typeCompte) }}
            </div>
            <div class="flex items-center justify-center sm:justify-start gap-1 text-sm text-gray-600">
              <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {{ profile.noteMoyenne?.toFixed(1) ?? 'N/A' }} ({{ profile.nbAvis }} avis)
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex bg-gray-100 rounded-full p-0.5 mb-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="flex-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Ventes tab -->
        <div v-if="activeTab === 'ventes'">
          <div v-if="ventesLoading" class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div v-for="i in 3" :key="i" class="card overflow-hidden">
              <div class="aspect-square bg-gray-200 skeleton" />
              <div class="p-3 space-y-2">
                <div class="h-4 bg-gray-200 rounded skeleton" />
                <div class="h-5 bg-gray-200 rounded skeleton w-16" />
              </div>
            </div>
          </div>
          <div v-else-if="!ventes.length" class="card p-8 text-center text-gray-500">
            Aucune vente publiée.
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ListingCard v-for="vente in ventes" :key="vente.id" :vente="vente" />
          </div>
        </div>

        <!-- Demandes tab -->
        <div v-if="activeTab === 'demandes'">
          <div v-if="demandesLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="card p-4">
              <div class="h-4 bg-gray-200 rounded skeleton" />
            </div>
          </div>
          <div v-else-if="!demandes.length" class="card p-8 text-center text-gray-500">
            Aucune demande créée.
          </div>
          <div v-else class="space-y-3">
            <NuxtLink
              v-for="demande in demandes"
              :key="demande.id"
              :to="`/demandes/${demande.id}`"
              class="card block p-4 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-2 mb-1">
                <MaterialBadge :materiau="demande.materiauSouhaite" size="sm" />
                <StatusBadge v-if="demande.statut" :statut="demande.statut as any" />
              </div>
              <h3 class="font-medium text-sm">{{ demande.titre }}</h3>
              <div class="text-sm text-gray-500">{{ formatPrice(demande.budgetMax) }}</div>
            </NuxtLink>
          </div>
        </div>

        <!-- Avis tab -->
        <div v-if="activeTab === 'avis'">
          <div v-if="reviews.length === 0" class="card p-8 text-center text-gray-500">
            Aucun avis reçu.
          </div>
          <div v-else class="space-y-3">
            <div v-for="review in reviews" :key="review.id" class="card p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium">{{ review.auteur?.prenom }} {{ review.auteur?.nom }}</span>
                <div class="flex items-center gap-0.5">
                  <svg v-for="s in review.note" :key="s" class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <p class="text-sm text-gray-600">{{ review.commentaire }}</p>
            </div>
          </div>
        </div>

        <!-- Paramètres rapides -->
        <div class="mt-8 card p-4 space-y-2">
          <NuxtLink to="/settings" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <span class="text-sm">Paramètres du compte</span>
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
          <NuxtLink to="/orders" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <span class="text-sm">Mes commandes</span>
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-between p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
          >
            <span class="text-sm">Se déconnecter</span>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </template>

      <div v-else-if="loading" class="space-y-4">
        <div class="h-32 bg-gray-200 rounded skeleton" />
        <div class="h-8 bg-gray-200 rounded skeleton w-1/3" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const userStore = useListingsStore();
const avisService = useAvisService();
const { logout, profile } = useAuth();

const route = useRoute();
const activeTab = ref<string>(route.query.tab as string || 'ventes');

const tabs = [
  { key: 'ventes', label: 'Ventes' },
  { key: 'demandes', label: 'Demandes' },
  { key: 'avis', label: 'Avis' },
];

const ventes = ref<AnnonceVente[]>([]);
const demandes = ref<AnnonceDemande[]>([]);
const reviews = ref<Avis[]>([]);
const ventesLoading = ref(false);
const demandesLoading = ref(false);
const loading = ref(true);

onMounted(async () => {
  if (!profile.value) return;
  const userId = profile.value.id;

  try {
    const [ventesRes, demandesRes, reviewsRes] = await Promise.all([
      userStore.getSellerVentes(userId, { limit: 10 }),
      userStore.getBuyerDemandes(userId, { limit: 10 }),
      avisService.getForUser(userId),
    ]);
    ventes.value = ventesRes.data;
    demandes.value = demandesRes.data;
    reviews.value = reviewsRes;
  } catch { /* ignore */ }
  finally {
    loading.value = false;
    ventesLoading.value = false;
    demandesLoading.value = false;
  }
});

async function handleLogout() {
  await logout();
  navigateTo('/login');
}

function formatTypeCompte(type: string): string {
  const labels: Record<string, string> = {
    ACHETEUR: 'Acheteur',
    IMPRIMEUR: 'Imprimeur',
    ADMIN: 'Administrateur',
  };
  return labels[type] || type;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
</script>
