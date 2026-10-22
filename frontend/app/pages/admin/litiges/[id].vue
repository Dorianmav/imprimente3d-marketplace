<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/admin/litiges" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Retour aux litiges</NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Arbitrage</h1>

      <template v-if="litige">
        <!-- Status -->
        <div class="card p-4 mb-6">
          <div class="flex items-center gap-2 mb-2">
            <StatusBadge :status="litige.statut" variant="litige" />
            <span class="text-sm text-gray-500">Commande #{{ litige.commandeId }}</span>
          </div>

          <!-- Status timeline -->
          <div class="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            <span class="flex items-center gap-1" :class="litige.statut !== 'OUVERT' ? 'text-green-600 font-medium' : ''">
              <span v-if="litige.statut !== 'OUVERT'">&#10003;</span>
              Ouvert
            </span>
            <span>&rarr;</span>
            <span class="flex items-center gap-1" :class="litige.statut === 'REPONSE_VENDEUR' || litige.statut === 'EN_ARBITRAGE' ? 'text-green-600 font-medium' : ''">
              <span v-if="litige.statut === 'REPONSE_VENDEUR' || litige.statut === 'EN_ARBITRAGE'">&#10003;</span>
              Réponse vendeur
            </span>
            <span>&rarr;</span>
            <span class="flex items-center gap-1" :class="litige.statut === 'EN_ARBITRAGE' ? 'text-green-600 font-medium' : ''">
              <span v-if="litige.statut === 'EN_ARBITRAGE'">&#10003;</span>
              En arbitrage
            </span>
          </div>
        </div>

        <!-- Details -->
        <div class="card p-4 mb-6 space-y-4">
          <div>
            <h3 class="font-medium text-sm mb-1">Motif</h3>
            <p class="text-sm">{{ motifLabel(litige.motif) }}</p>
          </div>
          <div>
            <h3 class="font-medium text-sm mb-1">Description</h3>
            <p class="text-sm text-gray-700">{{ litige.description }}</p>
          </div>
          <div>
            <h3 class="font-medium text-sm mb-1">Ouvert par</h3>
            <p class="text-sm">{{ litige.ouvertPar?.prenom }} {{ litige.ouvertPar?.nom }}</p>
          </div>
          <div v-if="litige.reponseVendeur">
            <h3 class="font-medium text-sm mb-1">Réponse du vendeur</h3>
            <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{{ litige.reponseVendeur }}</p>
          </div>
          <div>
            <h3 class="font-medium text-sm mb-1">Remboursement maximum</h3>
            <p class="text-lg font-medium">{{ formatPrice(litige.commande?.montantTotalAcheteur || 0) }}</p>
          </div>
        </div>

        <!-- Arbitration form (only for EN_ARBITRAGE) -->
        <div v-if="litige.statut === 'EN_ARBITRAGE'" class="card p-6 mb-6">
          <h2 class="font-sora font-bold text-xl mb-4">Arbitrer ce litige</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Décision</label>
              <select v-model="decision" class="w-full rounded-lg border border-gray-200 px-3 py-2">
                <option value="">-- Choisir une décision --</option>
                <option value="REMBOURSE_TOTAL">Remboursement total</option>
                <option value="REMBOURSE_PARTIEL">Remboursement partiel</option>
                <option value="REJETE">Rejeté (aucun remboursement)</option>
              </select>
            </div>

            <div v-if="decision === 'REMBOURSE_PARTIEL'">
              <label class="block text-sm font-medium mb-1">Montant du remboursement (€)</label>
              <input
                v-model="montantInput"
                type="number"
                step="0.01"
                min="0"
                :max="maxRembourse"
                class="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Montant en euros"
              />
              <p class="text-xs text-gray-400 mt-1">Max: {{ formatPrice(litige.commande?.montantTotalAcheteur || 0) }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Note admin (optionnelle)</label>
              <textarea
                v-model="noteAdmin"
                rows="3"
                class="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Raison de l'arbitrage..."
              />
            </div>

            <button
              @click="submitArbitration"
              class="w-full py-2.5 bg-primary-container text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
              :disabled="!decision || (decision === 'REMBOURSE_PARTIEL' && !montantValue)"
            >
              Valider l'arbitrage
            </button>
          </div>
        </div>

        <!-- Closed/Resolved status -->
        <div v-if="litige.statut === 'CLOS' && litige.decision" class="card p-6 mb-6 bg-green-50">
          <h2 class="font-sora font-bold text-xl text-green-700 mb-2">Arbitrage terminé</h2>
          <div class="space-y-1 text-sm">
            <p><span class="font-medium">Décision:</span> {{ decisionLabel(litige.decision) }}</p>
            <p v-if="litige.montantRembourse"><span class="font-medium">Montant remboursé:</span> {{ formatPrice(litige.montantRembourse) }}</p>
            <p v-if="litige.reponseAt"><span class="font-medium">Note admin:</span> {{ litige.reponseAt }}</p>
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div v-else-if="loading" class="space-y-4">
        <div class="h-24 bg-gray-200 rounded skeleton" />
        <div class="h-32 bg-gray-200 rounded skeleton" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';
import { useLitigeService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Arbitrage — Layerly');

const route = useRoute();
const { getDisputeDetail, arbitrateDispute } = useAdminService();
const { fetchProfile } = useAuth();
const { accessToken } = useAuth();

const litige = ref<any | null>(null);
const loading = ref(true);

const decision = ref('');
const montantInput = ref('');
const noteAdmin = ref('');

const maxRembourse = computed(() => litige.value?.commande?.montantTotalAcheteur || 0);
const montantValue = computed(() => montantInput.value ? parseFloat(montantInput.value) * 100 : 0);

onMounted(async () => {
  try {
    await fetchProfile();
    await loadLitige();
  } finally {
    loading.value = false;
  }
});

async function loadLitige() {
  const id = route.params.id as string;
  try {
    const res = await getDisputeDetail(accessToken.value, id);
    litige.value = res?.litige || res;
  } catch {
    showToast('Erreur chargement litige', 'error');
  }
}

async function submitArbitration() {
  const id = route.params.id as string;
  try {
    await arbitrateDispute(
      accessToken.value,
      id,
      decision.value,
      montantValue.value,
      noteAdmin.value,
      accessToken.value // adminId placeholder
    );
    showToast('Arbitrage validé', 'success');
    await loadLitige();
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur arbitrage', 'error');
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

function decisionLabel(d: string): string {
  const map: Record<string, string> = {
    REMBOURSE_TOTAL: 'Remboursement total',
    REMBOURSE_PARTIEL: 'Remboursement partiel',
    REJETE: 'Rejeté',
  };
  return map[d] || d;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
</script>
