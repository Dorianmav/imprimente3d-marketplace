<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Recherche</h1>

      <!-- Search bar -->
      <div class="mb-6">
        <SearchBar />
      </div>

      <!-- Results count -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-600">
          {{ results.length }} résultat(s) pour "{{ query }}"
        </p>

        <!-- Filters toggle (mobile) -->
        <button
          @click="showFilters = !showFilters"
          class="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtres
        </button>
      </div>

      <div class="grid md:grid-cols-[200px_1fr] gap-6">
        <!-- Sidebar filters -->
        <div class="hidden md:block">
          <div class="card p-4 sticky top-20 space-y-4">
            <div>
              <h3 class="font-medium text-sm mb-2">Type</h3>
              <div class="space-y-1">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input v-model="filters.type" type="checkbox" value="VENTE" class="rounded border-gray-300" />
                  Ventes
                </label>
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input v-model="filters.type" type="checkbox" value="DEMANDE" class="rounded border-gray-300" />
                  Demandes
                </label>
              </div>
            </div>

            <div>
              <h3 class="font-medium text-sm mb-2">Matériau</h3>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="materiau in materiaux"
                  :key="materiau"
                  @click="toggleMateriau(materiau)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="selectedMateriaux.includes(materiau) ? 'bg-primary-container text-white' : 'bg-gray-100 text-gray-600'"
                >
                  {{ materiau }}
                </button>
              </div>
            </div>

            <div>
              <h3 class="font-medium text-sm mb-2">Catégorie</h3>
              <select
                v-model="filters.categorie"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="">Toutes</option>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>

            <div>
              <h3 class="font-medium text-sm mb-2">Prix max (€)</h3>
              <input
                v-model="maxPrice"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-if="loading" v-for="i in 8" :key="i" class="card overflow-hidden">
          <div class="aspect-square bg-gray-200 skeleton" />
          <div class="p-3 space-y-2">
            <div class="h-4 bg-gray-200 rounded skeleton" />
            <div class="h-5 bg-gray-200 rounded skeleton w-16" />
          </div>
        </div>

        <template v-else>
          <ListingCard
            v-for="result in results"
            :key="result.id"
            :vente="result as unknown as AnnonceVente"
          />

          <div v-if="!loading && !results.length" class="col-span-full text-center py-16 text-gray-500">
            Aucun résultat pour "{{ query }}"
            <button @click="query = ''" class="text-primary-container hover:underline ml-2">
              Effacer la recherche
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSearchService } from '~/services/search.service';

const route = useRoute();
const query = ref((route.query.q as string) || '');
const loading = ref(false);
const showFilters = ref(false);
const maxPrice = ref<string>('');
const selectedMateriaux = ref<string[]>([]);

const filters = reactive({
  type: [] as string[],
  materiau: '',
  categorie: '',
});

const materiaux = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Résine'];

const categories = [
  { label: 'Figurines', value: 'FIGURINE' },
  { label: 'Objets home', value: 'HOME_DECOR' },
  { label: 'Gadgets', value: 'GADGET' },
  { label: 'Jeux de rôle', value: 'JEU_ROLE' },
  { label: 'Véhicules', value: 'VEHICULE' },
  { label: 'Autre', value: 'AUTRE' },
];

const results = ref<AnnonceVente[]>([]);

// Sync query from route
watch(() => route.query.q as string, (newQ) => {
  if (newQ) {
    query.value = newQ;
    doSearch();
  }
});

function toggleMateriau(m: string) {
  const idx = selectedMateriaux.value.indexOf(m);
  if (idx === -1) selectedMateriaux.value.push(m);
  else selectedMateriaux.value.splice(idx, 1);
}

async function doSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  try {
    const result = await useSearchService().search({
      q: query.value.trim(),
      type: filters.type.length ? filters.type.join(',') : undefined,
      materiau: filters.categorie || undefined,
      minPrice: 0,
      maxPrice: maxPrice.value ? parseFloat(maxPrice.value) * 100 : undefined,
    });
    // Flatten results into a single array
    results.value = [
      ...(result as any).ventes || [],
      ...(result as any).demandes || [],
    ] as AnnonceVente[];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  doSearch();
});
</script>
