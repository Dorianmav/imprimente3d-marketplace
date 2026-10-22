<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/orders" class="text-sm text-[#12403F] hover:underline mb-4 inline-block">
        ← Retour aux commandes
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Détail du litige</h1>

      <div v-if="loading" class="space-y-3">
        <div class="h-32 bg-gray-200 rounded skeleton" />
        <div class="h-24 bg-gray-200 rounded skeleton" />
      </div>

      <div v-else-if="litige" class="space-y-4">
        <!-- Status card -->
        <div class="card p-4 flex items-center justify-between" :class="statusClass">
          <div class="font-medium">{{ statusLabel }}</div>
          <StatusBadge :status="litige.statut" variant="litige" />
        </div>

        <!-- Details -->
        <div class="card p-6 space-y-4">
          <h2 class="font-medium">Détails de la réclamation</h2>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Motif:</span>
              <span class="ml-2">{{ motifLabel(litige.motif) }}</span>
            </div>
            <div>
              <span class="text-gray-500">Ouvert par:</span>
              <span class="ml-2">{{ litige.ouvertPar?.prenom }} {{ litige.ouvertPar?.nom }}</span>
            </div>
            <div>
              <span class="text-gray-500">Commande:</span>
              <NuxtLink :to="`/orders/${litige.commandeId}`" class="text-[#12403F] hover:underline ml-2">
                #{{ litige.commandeId }}
              </NuxtLink>
            </div>
            <div>
              <span class="text-gray-500">Créé le:</span>
              <span class="ml-2">{{ formatDate(litige.createdAt) }}</span>
            </div>
          </div>

          <div>
            <span class="text-sm font-medium text-gray-700">Description:</span>
            <p class="text-sm mt-1">{{ litige.description }}</p>
          </div>

          <!-- Photos -->
          <div v-if="litige.photos?.length">
            <span class="text-sm font-medium text-gray-700">Photos:</span>
            <div class="flex gap-2 mt-2">
              <img v-for="(photo, idx) in litige.photos" :key="idx" :src="photo" class="w-20 h-20 object-cover rounded" />
            </div>
          </div>

          <!-- Seller response -->
          <div v-if="litige.reponseVendeur">
            <span class="text-sm font-medium text-gray-700">Réponse du vendeur:</span>
            <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm">{{ litige.reponseVendeur }}</p>
            </div>
            <div v-if="litige.reponseAt" class="mt-2 p-3 bg-gray-50 rounded">
              <p class="text-xs text-gray-500">Réponse admin: {{ litige.reponseAt }}</p>
            </div>
          </div>

          <!-- Admin decision -->
          <div v-if="litige.decision">
            <span class="text-sm font-medium text-gray-700">Décision admin:</span>
            <div class="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p class="text-sm font-medium">{{ decisionLabel(litige.decision) }}</p>
              <p v-if="litige.montantRembourse" class="text-sm mt-1">
                Montant remboursé: {{ formatPrice(litige.montantRembourse) }}
              </p>
              <p v-if="litige.decideParId" class="text-xs text-gray-500 mt-1">
                Décidé par l'admin
              </p>
            </div>
          </div>
        </div>

        <!-- Actions: Respond to dispute -->
        <div v-if="litige.statut === 'REPONSE_VENDEUR'" class="card p-6 space-y-3">
          <h2 class="font-medium">Votre réponse</h2>
          <textarea
            v-model="responseText"
            rows="3"
            placeholder="Tapez votre réponse..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            @click="handleRespond"
            :disabled="!responseText.trim() || loading"
            class="py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Envoi...' : 'Envoyer la réponse' }}
          </button>
        </div>
      </div>

      <div v-else class="text-center py-12">
        <p class="text-gray-500">Litige introuvable.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Litige } from '~/types';
import { useLitigeService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['auth'] });
setTitle('Litige — Layerly');

const route = useRoute();
const { findById, respondToDispute } = useLitigeService();
const { accessToken, fetchProfile } = useAuth();

const litige = ref<Litige | null>(null);
const loading = ref(true);
const responseText = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    if (route.params.id) {
      litige.value = await findById(accessToken.value, route.params.id as string);
    }
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function handleRespond() {
  if (!litige.value || !responseText.value.trim()) return;
  loading.value = true;
  try {
    await respondToDispute(accessToken.value, litige.value.id, responseText.value);
    litige.value = await findById(accessToken.value, litige.value.id);
    responseText.value = '';
    showToast('Réponse envoyée', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  } finally {
    loading.value = false;
  }
}

function motifLabel(m: string): string {
  const map: Record<string, string> = {
    NON_RECU: "Je n'ai pas reçu la commande",
    NON_CONFORME: "Article non conforme",
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

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    OUVERT: 'Litige ouvert',
    REPONSE_VENDEUR: 'En attente réponse vendeur',
    EN_ARBITRAGE: 'En arbitrage',
    CLOS: 'Litige clos',
  };
  return map[litige.value?.statut || ''] || litige.value?.statut || '';
});

const statusClass = computed(() => {
  const map: Record<string, string> = {
    OUVERT: 'bg-amber-50 border border-amber-200',
    REPONSE_VENDEUR: 'bg-blue-50 border border-blue-200',
    EN_ARBITRAGE: 'bg-purple-50 border border-purple-200',
    CLOS: 'bg-green-50 border border-green-200',
  };
  return map[litige.value?.statut || ''] || '';
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
</script>
