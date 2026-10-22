<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/dashboard" class="text-sm text-[#12403F] hover:underline mb-4 inline-block">
        ← Tableau de bord
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Mes litiges</h1>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded skeleton" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!litiges.length" class="text-center py-12">
        <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-500">Aucun litige.</p>
      </div>

      <!-- List -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="litige in litiges"
          :key="litige.id"
          :to="`/litiges/${litige.id}`"
          class="block card p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-sm">Commande #{{ litige.commandeId }}</span>
                <StatusBadge :status="litige.statut" variant="litige" />
              </div>
              <div class="text-xs text-gray-500">
                {{ motifLabel(litige.motif) }} · Ouvert le {{ formatDate(litige.createdAt) }}
              </div>
              <div v-if="litige.reponseVendeur" class="text-xs text-gray-500 mt-1 line-clamp-1">
                Réponse vendeur: {{ litige.reponseVendeur }}
              </div>
              <div v-if="litige.decision" class="text-xs text-green-600 mt-1 font-medium">
                Décision: {{ decisionLabel(litige.decision) }}
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Litige } from '~/types';
import { useLitigeService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['auth'] });
setTitle('Mes litiges — Layerly');

const { getMy } = useLitigeService();
const { accessToken, fetchProfile } = useAuth();

const litiges = ref<Litige[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    await fetchProfile();
    litiges.value = await getMy(accessToken.value);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

function motifLabel(m: string): string {
  const map: Record<string, string> = {
    NON_RECU: "Je n'ai pas reçu la commande",
    NON_CONFORME: 'Article non conforme',
    ENDOMMAGE: 'Article endommagé',
    AUTRE: 'Autre',
  };
  return map[m] || m;
}

function decisionLabel(d: string): string {
  const map: Record<string, string> = {
    REMBOURSE_TOTAL: 'Remboursement total',
    REMBOURSE_PARTIEL: 'Remboursement partiel',
    REJETE: 'Litige rejeté',
  };
  return map[d] || d;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
</script>
