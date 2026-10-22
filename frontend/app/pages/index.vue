<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-[#12403F] to-[#3b6564] text-white">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
      </div>
      <div class="max-w-7xl mx-auto px-4 py-12 md:py-20 relative">
        <div class="max-w-2xl">
          <h1 class="font-sora font-bold text-3xl md:text-5xl leading-tight mb-4">
            Votre marketplace de modèles 3D
          </h1>
          <p class="text-white/80 text-base md:text-lg mb-6 max-w-lg">
            Vendez, achetez ou faites imprimer vos modèles 3D. Une communauté d'imprimeurs et de créateurs à votre service.
          </p>
          <div class="max-w-xl">
            <SearchBar />
          </div>

          <!-- Quick categories -->
          <div class="flex flex-wrap gap-2 mt-4">
            <button
              v-for="cat in categories"
              :key="cat.value"
              @click="filterByCategory(cat.value)"
              class="px-3 py-1 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Filters & Sort -->
    <section class="sticky top-14 md:top-14 z-30 bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <!-- Category filter -->
        <UDropdownMenu
          :items="categoryFilterItems"
          :popper="{ placement: 'bottom-start' }"
        >
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap">
            {{ selectedCategory || 'Toutes catégories' }}
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </UDropdownMenu>

        <!-- Material filter -->
        <UDropdownMenu
          :items="materialFilterItems"
          :popper="{ placement: 'bottom-start' }"
        >
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap">
            {{ selectedMateriau || 'Matériaux' }}
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </UDropdownMenu>

        <!-- Sort -->
        <UDropdownMenu
          :items="sortItems"
          :popper="{ placement: 'bottom-start' }"
        >
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap">
            Trier
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </UDropdownMenu>

        <div class="flex-1" />

        <!-- Tabs: Ventes / Demandes -->
        <div class="flex bg-gray-100 rounded-full p-0.5">
          <button
            @click="activeTab = 'ventes'"
            class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
            :class="activeTab === 'ventes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          >
            Ventes
          </button>
          <button
            @click="activeTab = 'demandes'"
            class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
            :class="activeTab === 'demandes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          >
            Demandes
          </button>
        </div>
      </div>
    </section>

    <!-- Listings Grid -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Loading skeleton -->
      <div v-if="store.loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="card overflow-hidden">
          <div class="aspect-square bg-gray-200 skeleton" />
          <div class="p-3 space-y-2">
            <div class="h-4 bg-gray-200 rounded skeleton w-3/4" />
            <div class="h-3 bg-gray-200 rounded skeleton w-1/2" />
            <div class="flex justify-between">
              <div class="h-5 bg-gray-200 rounded skeleton w-16" />
              <div class="h-3 bg-gray-200 rounded skeleton w-12" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!store.ventes.length && !store.demandes.length" class="text-center py-16">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="font-sora font-semibold text-lg text-gray-700 mb-1">Aucun résultat</h3>
        <p class="text-sm text-gray-500">Essayez de modifier vos filtres</p>
      </div>

      <!-- Ventes grid -->
      <div v-else-if="activeTab === 'ventes'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <ListingCard
          v-for="vente in store.ventes"
          :key="vente.id"
          :vente="vente"
        />
      </div>

      <!-- Demandes grid -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="demande in store.demandes"
          :key="demande.id"
          :to="`/demandes/${demande.id}`"
          class="card block p-4 transition-all hover:scale-[1.01]"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <MaterialBadge :materiau="demande.materiauSouhaite" size="sm" />
                <span class="text-xs text-gray-500">{{ demande.categorie }}</span>
              </div>
              <h3 class="font-sora font-semibold text-sm mb-1">{{ demande.titre }}</h3>
              <p class="text-xs text-gray-500 line-clamp-2">{{ demande.description }}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-sora font-bold text-primary-container">{{ formatPrice(demande.budgetMax) }}</div>
              <div class="text-xs text-gray-500">{{ getQuoteCount(demande) }} offres</div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useListingsStore } from '~/stores/listings';
import { Materiau } from '~/types';

useHead({
  title: 'Layerly — Marketplace de modèles 3D',
  meta: [
    { name: 'description', content: 'Vendez, achetez ou faites imprimer vos modèles 3D.' },
  ],
});

const store = useListingsStore();

const activeTab = ref<'ventes' | 'demandes'>('ventes');
const selectedCategory = ref<string>('');
const selectedMateriau = ref<string>('');

// Categories
const categories = [
  { label: 'Figurines', value: 'FIGURINE' },
  { label: 'Objets home', value: 'HOME_DECOR' },
  { label: 'Gadgets', value: 'GADGET' },
  { label: 'Jeux de rôle', value: 'JEU_ROLE' },
  { label: 'Véhicules', value: 'VEHICULE' },
  { label: 'Autre', value: 'AUTRE' },
];

const categoryFilterItems = computed(() => [
  [
    { label: 'Toutes catégories', click: () => { selectedCategory.value = ''; store.fetchVentes({ tri: 'recent' }); } },
    { type: 'divider' },
    ...categories.map(c => ({
      label: c.label,
      click: () => { selectedCategory.value = c.label; store.fetchVentes({ categorie: c.value, tri: 'recent' }); },
    })),
  ],
]);

const materialFilterItems = computed(() => [
  [
    { label: 'Tous matériaux', click: () => { selectedMateriau.value = ''; store.fetchVentes({ tri: 'recent' }); } },
    { type: 'divider' },
    ...Object.values(Materiau).filter(m => typeof m === 'string').map(m => ({
      label: m,
      click: () => {
        selectedMateriau.value = m;
        store.fetchVentes({ materiau: m, tri: 'recent' });
      },
    })),
  ],
]);

const sortItems = computed(() => [
  [
    { label: 'Plus récent', click: () => store.fetchVentes({ tri: 'recent' }) },
    { label: 'Prix croissant', click: () => store.fetchVentes({ tri: 'price_asc' }) },
    { label: 'Prix décroissant', click: () => store.fetchVentes({ tri: 'price_desc' }) },
    { label: 'Meilleures notes', click: () => store.fetchVentes({ tri: 'rating' }) },
  ],
]);

function filterByCategory(cat: string) {
  selectedCategory.value = categories.find(c => c.value === cat)?.label || '';
  store.fetchVentes({ categorie: cat, tri: 'recent' });
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function getQuoteCount(demande: AnnonceDemande): number {
  return (demande as any).devisCount || 0;
}

// Initial fetch
onMounted(() => {
  store.fetchVentes({ tri: 'recent' });
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
