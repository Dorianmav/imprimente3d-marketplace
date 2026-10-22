<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div v-if="!loading && vente" class="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <div class="grid md:grid-cols-2 gap-6 md:gap-10">
        <!-- Left: Images -->
        <div class="space-y-3">
          <!-- Main image -->
          <div class="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
            <img
              v-if="vente.fichiers3d?.[0]?.url"
              :src="vente.fichiers3d[0].url"
              :alt="vente.titre"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
              <svg class="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- 3D Viewer placeholder -->
            <button class="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1-2-1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                Voir en 3D
              </span>
            </button>
          </div>

          <!-- Thumbnails -->
          <div v-if="vente.fichiers3d?.length && vente.fichiers3d.length > 1" class="flex gap-2 overflow-x-auto scrollbar-hide">
            <div
              v-for="(file, idx) in vente.fichiers3d"
              :key="idx"
              class="w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-container cursor-pointer transition-colors"
            >
              <img :src="file.url" :alt="`Thumbnail ${idx + 1}`" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- Right: Info -->
        <div class="space-y-4">
          <!-- Header -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <MaterialBadge :materiau="vente.materiau" />
              <span v-if="vente.categorie" class="text-xs text-gray-500">{{ vente.categorie }}</span>
            </div>
            <h1 class="font-sora font-bold text-2xl md:text-3xl mb-2">{{ vente.titre }}</h1>
            <p class="text-gray-600 text-sm leading-relaxed">{{ vente.description }}</p>
          </div>

          <!-- Seller card -->
          <div class="card p-4">
            <NuxtLink :to="`/profile/${vente.seller?.id}`" class="flex items-center gap-3 group">
              <UAvatar :src="vente.seller?.avatarUrl" :alt="vente.seller?.prenom || 'U'" size="lg" />
              <div class="flex-1">
                <div class="font-sora font-semibold text-sm group-hover:text-primary-container transition-colors">
                  {{ vente.seller?.prenom }} {{ vente.seller?.nom }}
                </div>
                <div class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {{ vente.noteMoyenne?.toFixed(1) ?? 'N/A' }} ({{ vente.nombreAvis }} avis)
                </div>
              </div>
              <svg class="w-5 h-5 text-gray-400 group-hover:text-primary-container transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Price & Actions -->
          <div class="card p-4 space-y-3">
            <div class="flex items-end justify-between">
              <div>
                <div class="text-xs text-gray-500 mb-0.5">Prix</div>
                <div class="font-sora font-bold text-3xl text-primary-container">
                  {{ formatPrice(vente.prix) }}
                </div>
              </div>
              <div class="text-xs text-gray-500 text-right">
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ formatDate(vente.createdAt) }}
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="flex gap-2">
              <button
                @click="handleBuy"
                class="flex-1 py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors shadow-md shadow-primary-container/20"
              >
                Acheter
              </button>
              <button
                @click="handleMessage"
                class="px-4 py-3 rounded-full border border-gray-200 hover:border-primary-container text-gray-700 hover:text-primary-container transition-colors"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>

            <!-- Features -->
            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Fichiers STL/OBJ
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Livraison numérique
              </div>
            </div>
          </div>

          <!-- Specs -->
          <div class="card p-4">
            <h3 class="font-sora font-semibold mb-3">Détails</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt class="text-gray-500">Matériau</dt>
              <dd><MaterialBadge :materiau="vente.materiau" /></dd>

              <dt class="text-gray-500">Catégorie</dt>
              <dd class="text-gray-900">{{ vente.categorie || '—' }}</dd>

              <dt class="text-gray-500">Format</dt>
              <dd class="text-gray-900">{{ (vente.fichiers3d?.[0]?.nom || '').split('.').pop()?.toUpperCase() || '—' }}</dd>

              <dt class="text-gray-500">Vendeurs</dt>
              <dd class="text-gray-900">{{ vente.seller?.prenom }} {{ vente.seller?.nom }}</dd>
            </dl>
          </div>
        </div>
      </div>

      <!-- Reviews section -->
      <div class="mt-8 md:mt-12">
        <h2 class="font-sora font-bold text-xl mb-4">Avis clients</h2>
        <div v-if="reviews.length === 0" class="card p-8 text-center text-gray-500">
          Aucun avis pour ce modèle.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="review in reviews"
            :key="review.id"
            class="card p-4"
          >
            <div class="flex items-center gap-2 mb-2">
              <UAvatar :src="review.auteur?.avatarUrl" size="xs" />
              <span class="font-medium text-sm">{{ review.auteur?.prenom }} {{ review.auteur?.nom }}</span>
              <div class="flex items-center gap-0.5">
                <svg v-for="s in review.note" :key="s" class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <p class="text-sm text-gray-600">{{ review.contenu }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
      <div class="aspect-square rounded-2xl bg-gray-200 skeleton" />
      <div class="space-y-4">
        <div class="h-8 bg-gray-200 rounded skeleton w-2/3" />
        <div class="h-4 bg-gray-200 rounded skeleton w-full" />
        <div class="h-4 bg-gray-200 rounded skeleton w-4/5" />
        <div class="h-24 bg-gray-200 rounded skeleton" />
        <div class="h-12 bg-gray-200 rounded skeleton w-1/2" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const avisService = useAvisService();
const store = useListingsStore();
const { profile } = useAuth();

const vente = ref<AnnonceVente | null>(null);
const reviews = ref<Avis[]>([]);
const loading = ref(true);

// Fetch vente & reviews
onMounted(async () => {
  try {
    const [v, revs] = await Promise.all([
      store.fetchVente(route.params.id as string),
      avisService.getForUser(route.params.id as string, { limit: 10 }),
    ]);
    vente.value = v;
    reviews.value = revs;
  } finally {
    loading.value = false;
  }
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function handleBuy() {
  if (!profile.value) {
    navigateTo('/login?redirect=/ventes/' + route.params.id);
    return;
  }
  // Create a commande from this vente
  navigateTo('/checkout?venteId=' + route.params.id);
}

function handleMessage() {
  if (!profile.value) {
    navigateTo('/login');
    return;
  }
  const sellerId = vente.value?.seller?.id;
  if (sellerId) {
    navigateTo(`/messages?userId=${sellerId}`);
  }
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
