<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div v-if="!loading && demande" class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-container mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour à l'accueil
      </NuxtLink>

      <!-- Demande header -->
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <MaterialBadge :materiau="demande.materiauSouhaite" />
          <span class="text-xs text-gray-500">{{ demande.categorie }}</span>
          <StatusBadge v-if="demande.statut" :statut="demande.statut as any" />
        </div>
        <h1 class="font-sora font-bold text-2xl md:text-3xl mb-2">{{ demande.titre }}</h1>
        <p class="text-gray-600 leading-relaxed">{{ demande.description }}</p>

        <!-- Budget & Author -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            <div class="text-xs text-gray-500">Budget max</div>
            <div class="font-sora font-bold text-xl text-primary-container">
              {{ formatPrice(demande.budgetMax) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500 mb-1">Auteur</div>
            <NuxtLink :to="`/profile/${demande.acheteur?.id}`" class="flex items-center gap-2">
              <UAvatar :src="demande.acheteur?.avatarUrl" :alt="demande.acheteur?.prenom || 'U'" size="sm" />
              <span class="font-medium text-sm">{{ demande.acheteur?.prenom }} {{ demande.acheteur?.nom }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Reference photos -->
        <div v-if="demande.photosReference?.length" class="mt-4 grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
          <img
            v-for="(photo, idx) in demande.photosReference"
            :key="idx"
            :src="photo"
            :alt="`Photo référence ${idx + 1}`"
            class="w-full h-24 object-cover"
          />
        </div>
      </div>

      <!-- Devis section -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-sora font-bold text-xl">
          Propositions <span class="text-gray-500 font-normal">(devis)</span>
        </h2>
        <NuxtLink
          v-if="isImprimeur"
          :to="`/devis/new?demandeId=${route.params.id}`"
          class="px-3 py-1.5 rounded-full text-sm font-medium bg-primary-container text-white hover:bg-primary transition-colors"
        >
          Faire une proposition
        </NuxtLink>
      </div>

      <!-- Loading devis -->
      <div v-if="devisLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="card p-4 space-y-3">
          <div class="h-4 bg-gray-200 rounded skeleton w-1/4" />
          <div class="h-3 bg-gray-200 rounded skeleton w-1/2" />
          <div class="h-6 bg-gray-200 rounded skeleton w-1/3" />
        </div>
      </div>

      <!-- Devis list -->
      <div v-else class="space-y-3">
        <div v-if="!devis.length" class="card p-8 text-center text-gray-500">
          Aucune proposition pour le moment. Soyez le premier !
        </div>

        <div
          v-for="devisItem in devis"
          :key="devisItem.id"
          class="card p-5"
        >
          <!-- Devise header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <NuxtLink :to="`/profile/${devisItem.vendeurId || devisItem.imprimeurId}`">
                <UAvatar :src="devisItem.imprimeur?.avatarUrl" :alt="devisItem.imprimeur?.prenom || 'U'" size="sm" />
              </NuxtLink>
              <div>
                <NuxtLink
                  :to="`/profile/${devisItem.vendeurId || devisItem.imprimeurId}`"
                  class="font-medium text-sm hover:text-primary-container transition-colors"
                >
                  {{ devisItem.imprimeur?.prenom }} {{ devisItem.imprimeur?.nom }}
                </NuxtLink>
                <div class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {{ devisItem.imprimeur?.noteMoyenne?.toFixed(1) ?? '—' }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-sora font-bold text-lg text-primary-container">{{ formatPrice(devisItem.prixProduit) }}</div>
              <div class="text-xs text-gray-500">+ {{ formatPrice(devisItem.fraisLivraison) }} livraison</div>
            </div>
          </div>

          <p class="text-sm text-gray-600 mb-3">{{ devisItem.description }}</p>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-400">
              Proposé le {{ formatDate(devisItem.createdAt) }}
            </div>
            <div class="flex-1" />
            <button
              v-if="demande.statut === 'EN_ATTENTE'"
              @click="handleAccept(devisItem.id)"
              class="px-4 py-1.5 rounded-full text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Accepter
            </button>
            <button
              v-if="demande.statut === 'EN_ATTENTE'"
              @click="handleDecline(devisItem.id)"
              class="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors"
            >
              Refuser
            </button>
          </div>
        </div>
      </div>

      <!-- Demande status -->
      <div v-if="demande.statut === 'CLOSED'" class="mt-6 card p-4 bg-gray-50 border border-gray-200">
        <p class="text-sm text-gray-600">Cette demande a été clôturée.</p>
      </div>
    </div>

    <div v-if="loading" class="max-w-4xl mx-auto px-4 py-8">
      <div class="h-8 bg-gray-200 rounded skeleton w-2/3 mb-4" />
      <div class="h-4 bg-gray-200 rounded skeleton w-full" />
      <div class="h-4 bg-gray-200 rounded skeleton w-4/5" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const demandeService = useDemandeService();
const devisService = useDevisService();
const { accessToken, profile } = useAuth();

const demande = ref<AnnonceDemande | null>(null);
const devis = ref<Devis[]>([]);
const loading = ref(true);
const devisLoading = ref(true);

const isImprimeur = computed(() => profile.value?.typeCompte === 'IMPRIMEUR');

onMounted(async () => {
  try {
    const [d, quotes] = await Promise.all([
      demandeService.findById(route.params.id as string),
      devisService.getQuotesForDemande(route.params.id as string),
    ]);
    demande.value = d;
    devis.value = quotes;
  } finally {
    loading.value = false;
    devisLoading.value = false;
  }
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

async function handleAccept(devisId: string) {
  if (!accessToken.value) return;
  try {
    await devisService.acceptQuote(accessToken.value, devisId);
    devis.value = devis.value.filter(d => d.id !== devisId);
    showToast('Proposition acceptée !', 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation';
    showToast(msg, 'error');
  }
}

async function handleDecline(devisId: string) {
  if (!accessToken.value) return;
  try {
    await devisService.declineQuote(accessToken.value, devisId);
    devis.value = devis.value.filter(d => d.id !== devisId);
    showToast('Proposition refusée.', 'info');
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur', 'error');
  }
}
</script>
