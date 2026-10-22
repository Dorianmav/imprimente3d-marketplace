<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div v-if="!loading && order" class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/orders" class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-container mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux commandes
      </NuxtLink>

      <div class="flex items-center justify-between mb-6">
        <h1 class="font-sora font-bold text-2xl md:text-3xl">Commande</h1>
        <div class="flex items-center gap-2">
          <StatusBadge :statut="order.statut as any" />
          <span class="text-xs text-gray-500">#{{ order.id.slice(0, 8) }}</span>
        </div>
      </div>

      <!-- Progress stepper -->
      <div class="card p-6 mb-6">
        <h3 class="font-sora font-semibold mb-4">Progression</h3>
        <div class="flex items-center justify-between relative">
          <!-- Line -->
          <div class="absolute left-0 right-0 top-5 h-1 bg-gray-200" />
          <div
            class="absolute left-0 top-5 h-1 bg-primary-container transition-all duration-500"
            :style="{ width: getProgressWidth() }"
          />

          <div
            v-for="(step, idx) in steps"
            :key="step"
            class="relative z-10 flex flex-col items-center"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              :class="getStepClass(idx)"
            >
              <svg v-if="getStepStatus(idx) === 'done'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <span class="text-[10px] mt-1 text-center" :class="getStepTextClass(idx)">{{ step }}</span>
          </div>
        </div>
      </div>

      <!-- Order details -->
      <div class="card p-6 space-y-4 mb-6">
        <h3 class="font-sora font-semibold">Détails</h3>

        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt class="text-gray-500">Type</dt>
          <dd class="text-gray-900">{{ order.sourceType }}</dd>

          <dt class="text-gray-500">Quantité</dt>
          <dd class="text-gray-900">{{ order.quantite || 1 }}</dd>

          <dt class="text-gray-500">Mode de livraison</dt>
          <dd class="text-gray-900">{{ order.modeLivraison }}</dd>

          <dt class="text-gray-500">Total</dt>
          <dd class="font-sora font-bold text-lg text-primary-container">
            {{ formatPrice(order.montantTotalAcheteur || 0) }}
          </dd>
        </dl>
      </div>

      <!-- Actions -->
      <div class="card p-4 space-y-2">
        <template v-if="order.statut === StatutCommande.EN_ATTENTE">
          <button
            @click="handlePay"
            class="w-full py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors"
          >
            Payer maintenant
          </button>
          <button
            @click="handleCancel"
            class="w-full py-3 rounded-full border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors"
          >
            Annuler la commande
          </button>
        </template>
        <template v-if="order.statut === StatutCommande.EXPIREEE && isAcheteur">
          <button
            @click="handleConfirmReceipt"
            class="w-full py-3 rounded-full font-sora font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors"
          >
            Confirmer la réception
          </button>
        </template>
        <template v-if="order.statut === StatutCommande.EXPIREEE && !isAcheteur">
          <button
            @click="handleShip"
            class="w-full py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors"
          >
            Marquer comme expédié
          </button>
        </template>
      </div>

      <!-- Actions for buyer/seller -->
      <div v-if="isAcheteur" class="mt-3 card p-4">
        <h3 class="font-sora font-semibold mb-3">Actions acheteur</h3>
        <div class="space-y-2">
          <button
            v-if="order.statut === 'LITIGE'"
            @click="navigateTo('/litiges/' + order.id)"
            class="w-full py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm"
          >
            Gérer le litige en cours
          </button>
          <button
            v-if="order.statut === 'LIVREE' || order.statut === 'EXPEDIEE'"
            @click="navigateTo('/litiges/new?commandeId=' + order.id)"
            class="w-full py-2 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors text-sm"
          >
            Ouvrir un litige
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="max-w-3xl mx-auto px-4 py-8">
      <div class="h-8 bg-gray-200 rounded skeleton w-1/3 mb-6" />
      <div class="h-32 bg-gray-200 rounded skeleton" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { accessToken, profile } = useAuth();
const store = useOrdersStore();

const order = ref<Commande | null>(null);
const loading = ref(true);
const isAcheteur = computed(() => profile.value?.typeCompte === 'ACHETEUR');

const steps = ['Passée', 'Payée', 'En production', 'Expédiée', 'Livrée'];

onMounted(async () => {
  try {
    const o = await store.fetchOrder(route.params.id as string);
    order.value = o;
  } finally {
    loading.value = false;
  }
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function getStepStatus(idx: number): 'pending' | 'active' | 'done' {
  if (!order.value) return 'pending';
  const map: Record<string, number> = {
    [StatutCommande.EN_ATTENTE]: 0,
    [StatutCommande.PAYEE]: 1,
    [StatutCommande.EN_COURS_DE_PROD]: 2,
    [StatutCommande.EXPIREEE]: 3,
    [StatutCommande.LIVREE]: 4,
    [StatutCommande.ANNULEE]: -1,
    [StatutCommande.LITIGE]: -1,
  };
  const current = map[order.value.statut] ?? 0;
  if (current === idx) return 'active';
  if (current > idx) return 'done';
  return 'pending';
}

function getStepClass(idx: number): string {
  const s = getStepStatus(idx);
  switch (s) {
    case 'done': return 'bg-green-500 text-white';
    case 'active': return 'bg-primary-container text-white';
    default: return 'bg-gray-200 text-gray-500';
  }
}

function getStepTextClass(idx: number): string {
  return getStepStatus(idx) === 'pending' ? 'text-gray-400' : 'text-gray-700';
}

function getProgressWidth(): string {
  if (!order.value) return '0%';
  const map: Record<string, string> = {
    [StatutCommande.EN_ATTENTE]: '10%',
    [StatutCommande.PAYEE]: '30%',
    [StatutCommande.EN_COURS_DE_PROD]: '50%',
    [StatutCommande.EXPIREEE]: '70%',
    [StatutCommande.LIVREE]: '100%',
    [StatutCommande.ANNULEE]: '0%',
    [StatutCommande.LITIGE]: '0%',
  };
  return map[order.value.statut] || '0%';
}

async function handlePay() {
  try {
    await store.confirmPayment(order.value!.id, 'pi_mock_123');
    showToast('Paiement confirmé', 'success');
  } catch {
    showToast('Erreur de paiement', 'error');
  }
}

async function handleConfirmReceipt() {
  try {
    await store.confirmReceipt(order.value!.id);
    showToast('Réception confirmée', 'success');
  } catch {
    showToast('Erreur', 'error');
  }
}

async function handleCancel() {
  if (!confirm('Annuler cette commande ?')) return;
  try {
    await store.cancelOrder(order.value!.id);
    showToast('Commande annulée', 'success');
  } catch {
    showToast('Erreur', 'error');
  }
}

async function handleShip() {
  try {
    await store.shipOrder(order.value!.id);
    showToast('Commande marquée comme expédiée', 'success');
  } catch {
    showToast('Erreur', 'error');
  }
}
</script>
