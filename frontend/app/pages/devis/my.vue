<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Mes devis</h1>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="py-2 px-4 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === tab.key ? 'bg-white shadow-sm text-[#12403F]' : 'text-gray-600'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded skeleton" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!devis.length" class="text-center py-12">
        <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-gray-500">Aucun devis pour le moment.</p>
      </div>

      <!-- Devis list -->
      <div v-else class="space-y-3">
        <div
          v-for="devis in devis"
          :key="devis.id"
          class="card p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <NuxtLink
                  :to="`/demandes/${devis.demandeId}`"
                  class="font-medium truncate hover:underline"
                >
                  {{ devis.demande?.titre }}
                </NuxtLink>
                <StatusBadge :status="devis.statut" variant="devis" />
              </div>
              <div class="text-sm text-gray-600">
                <span class="font-medium">{{ devis.imprimeur?.prenom }} {{ devis.imprimeur?.nom }}</span>
                · {{ formatPrice(devis.prixProduit) }} + {{ formatPrice(devis.fraisLivraison) }} livraison
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Matériau: {{ devis.materiauPropose }} · Délai: {{ devis.delaiJours }} jours
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-xs text-gray-400">Valide jusqu'au</div>
              <div class="text-sm">{{ formatDate(devis.validiteJusquA) }}</div>
              <div v-if="devis.statut === 'EN_ATTENTE'" class="mt-2 flex gap-1">
                <button
                  @click="acceptDevis(devis.id)"
                  class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Accepter
                </button>
                <button
                  @click="declineDevis(devis.id)"
                  class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Devis } from '~/types';
import { useDevisService } from '~/services/demande.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['auth'] });
setTitle('Mes devis — Layerly');

const { getMyQuotes: getMy, acceptQuote: accept, declineQuote: decline } = useDevisService();
const { accessToken, profile, fetchProfile } = useAuth();

const devis = ref<Devis[]>([]);
const loading = ref(true);
const activeTab = ref('all');

const tabs = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'Acceptés' },
  { key: 'declined', label: 'Refusés' },
];

onMounted(async () => {
  try {
    await fetchProfile();
    const data = await getMy(accessToken.value);
    devis.value = data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function acceptDevis(id: string) {
  try {
    await accept(accessToken.value, id);
    const index = devis.value.findIndex(d => d.id === id);
    if (index !== -1) devis.value[index] = { ...devis.value[index], statut: 'ACCEPTE' as any };
    showToast('Devis accepté !', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

async function declineDevis(id: string) {
  try {
    await decline(accessToken.value, id);
    const index = devis.value.findIndex(d => d.id === id);
    if (index !== -1) devis.value[index] = { ...devis.value[index], statut: 'REFUSE' as any };
    showToast('Devis refusé', 'info');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR');
}
</script>
