<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Litiges</h1>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterStatut" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous statuts</option>
          <option value="OUVERT">Ouvert</option>
          <option value="REPONSE_VENDEUR">Réponse vendeur</option>
          <option value="EN_ARBITRAGE">En arbitrage</option>
          <option value="CLOS">Clos</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="litiges.length" class="space-y-3">
        <NuxtLink
          v-for="litige in litiges"
          :key="litige.id"
          :to="`/litiges/${litige.id}`"
          class="block card p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">Commande #{{ litige.commandeId }}</span>
                <StatusBadge :status="litige.statut" variant="litige" />
              </div>
              <div class="text-xs text-gray-500">
                {{ motifLabel(litige.motif) }} · Ouvert par {{ litige.ouvertPar?.prenom }} {{ litige.ouvertPar?.nom }}
              </div>
              <div class="text-xs text-gray-400 mt-1">{{ formatDate(litige.createdAt) }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-xs text-gray-400">Remboursement max</div>
              <div class="text-sm font-medium">{{ formatPrice(litige.commande?.montantTotalAcheteur || 0) }}</div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucun litige en cours.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Litige } from '~/types';
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Litiges — Layerly');

const { listDisputes } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const litiges = ref<Litige[]>([]);
const loading = ref(true);
const filterStatut = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadLitiges();
  } finally {
    loading.value = false;
  }
});

async function loadLitiges() {
  try {
    const params: any = {};
    if (filterStatut.value) params.statut = filterStatut.value;
    const res = await listDisputes(accessToken.value, params);
    litiges.value = Array.isArray(res?.litiges || res) ? res.litiges || res : [];
  } catch {
    // ignore
  }
}

function motifLabel(m: string): string {
  const map: Record<string, string> = {
    NON_RECU: "Je n'ai pas reçu la commande",
    NON_CONFORME: 'Article non conforme',
    ENDOMMAGE: 'Article endommagé',
    AUTRE: 'Autre',
  };
  return map[m] || m;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
