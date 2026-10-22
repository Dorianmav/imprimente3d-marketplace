<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-sora font-bold text-2xl md:text-3xl">Admin — Devis</h1>
        <button @click="loadQuotes" class="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          Recharger
        </button>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterStatut" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="ACCEPTE">Accepté</option>
          <option value="REFUSE">Refusé</option>
          <option value="EXPIRE">Expiré</option>
          <option value="RETIRE">Retiré</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="quotes.length" class="space-y-3">
        <NuxtLink
          v-for="quote in quotes"
          :key="quote.id"
          :to="`/demandes/${quote.demandeId}`"
          class="block card p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-sm">{{ quote.demande?.titre || quote.demandeId }}</span>
                <StatusBadge :status="quote.statut" variant="devis" />
              </div>
              <div class="text-xs text-gray-500">
                Imprimeur: {{ quote.imprimeur?.prenom }} {{ quote.imprimeur?.nom }}
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {{ formatDate(quote.createdAt) }}
                <span v-if="quote.validiteJusquA">· Expire: {{ formatDate(quote.validiteJusquA) }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-medium">{{ formatPrice(quote.prixProduit) }}</div>
              <div class="text-xs text-gray-400">+ {{ formatPrice(quote.fraisLivraison) }} liv.</div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucun devis trouvé.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Devis — Layerly');

const { listQuotes } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const quotes = ref<any[]>([]);
const loading = ref(true);
const filterStatut = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadQuotes();
  } finally {
    loading.value = false;
  }
});

async function loadQuotes() {
  try {
    const params: any = {};
    if (filterStatut.value) params.statut = filterStatut.value;
    const res = await listQuotes(accessToken.value, params);
    quotes.value = res?.devis || res?.data || [];
  } catch {
    showToast('Erreur chargement devis', 'error');
  }
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
