<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Mes commandes</h1>

      <!-- Role tabs: Acheteur / Vendeur -->
      <div class="flex bg-gray-100 rounded-full p-0.5 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeRole = tab.key"
          class="flex-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="activeRole === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Status filter -->
      <div class="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          @click="activeStatut = ''"
          class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          :class="activeStatut === '' ? 'bg-primary-container text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          Toutes
        </button>
        <button
          v-for="statut in statuts"
          :key="statut"
          @click="activeStatut = statut"
          class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          :class="activeStatut === statut ? 'bg-primary-container text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ statutLabel(statut) }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="card p-4">
          <div class="h-4 bg-gray-200 rounded skeleton mb-2 w-1/3" />
          <div class="h-3 bg-gray-200 rounded skeleton w-2/3" />
        </div>
      </div>

      <!-- Orders list -->
      <div v-else class="space-y-3">
        <div v-if="!store.orders.length" class="card p-8 text-center text-gray-500">
          Aucune commande.
        </div>

        <NuxtLink
          v-for="order in filteredOrders"
          :key="order.id"
          :to="`/orders/${order.id}`"
          class="card block p-4 transition-all hover:scale-[1.005]"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <StatusBadge :statut="order.statut as any" />
                <span class="text-xs text-gray-500">#{{ order.id.slice(0, 8) }}</span>
              </div>
              <div class="font-medium text-sm">{{ order.sourceType || order.modeLivraison || 'Commande' }}</div>
            </div>
            <div class="text-right">
              <div class="font-sora font-bold text-primary-container">{{ formatPrice(order.montantTotalAcheteur || 0) }}</div>
              <div class="text-xs text-gray-500">{{ (order as any).quantite || 1 }} pièce(s)</div>
            </div>
          </div>

          <!-- Progress bar for acheteur -->
          <div v-if="activeRole === 'acheteur'" class="w-full">
            <div class="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Passée</span>
              <span>Payée</span>
              <span>En production</span>
              <span>Expédiée</span>
              <span>Livrée</span>
            </div>
            <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-container rounded-full transition-all duration-500"
                :style="{ width: getProgressPercent(order.statut) + '%' }"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div class="text-xs text-gray-500">
              {{ formatDate(order.createdAt) }}
            </div>
            <div v-if="order.statut === StatutCommande.EN_ATTENTE && activeRole === 'acheteur'" class="flex gap-2">
              <button
                @click.stop="handlePay(order.id)"
                class="px-3 py-1 rounded-full text-xs font-medium bg-primary-container text-white hover:bg-primary transition-colors"
              >
                Payer
              </button>
              <button
                @click.stop="handleCancel(order.id)"
                class="px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500"
              >
                Annuler
              </button>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { accessToken } = useAuth();
const store = useOrdersStore();
const route = useRoute();

const activeRole = ref<'acheteur' | 'vendeur'>('acheteur');
const activeStatut = ref('');

const statuts = [
  'EN_ATTENTE', 'PAYEE', 'EN_COURS_DE_PROD', 'EXPIREEE', 'LIVREE', 'ANNULEE', 'LITIGE',
];

const tabs = [
  { key: 'acheteur' as const, label: 'Acheteur' },
  { key: 'vendeur' as const, label: 'Vendeur' },
];

onMounted(() => {
  if (accessToken.value) {
    store.fetchMyOrders(activeRole.value);
  }
});

watch(activeRole, () => {
  if (accessToken.value) store.fetchMyOrders(activeRole.value, activeStatut.value || undefined);
});

const filteredOrders = computed(() => {
  if (!activeStatut.value) return store.orders;
  return store.orders.filter(o => o.statut === activeStatut.value);
});

function statutLabel(s: string): string {
  const labels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    PAYEE: 'Payée',
    EN_COURS_DE_PROD: 'En production',
    EXPIREEE: 'Expédiée',
    LIVREE: 'Livrée',
    ANNULEE: 'Annulée',
    LITIGE: 'Litige',
  };
  return labels[s] || s;
}

function getProgressPercent(statut: string): number {
  const order = StatutCommande;
  const map: Record<string, number> = {
    [order.EN_ATTENTE]: 10,
    [order.PAYEE]: 25,
    [order.EN_COURS_DE_PROD]: 50,
    [order.EXPIREEE]: 75,
    [order.LIVREE]: 100,
    [order.ANNULEE]: 0,
    [order.LITIGE]: 0,
  };
  return map[statut] || 10;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function handlePay(commandeId: string) {
  try {
    // Create Stripe payment intent
    const stripeService = useStripeService();
    if (!accessToken.value) return;
    const { clientSecret } = await stripeService.getPaymentIntent(accessToken.value, commandeId);
    // In a real app, use Stripe Elements or Stripe Checkout here
    // For now, just confirm payment
    await store.confirmPayment(commandeId, 'pi_mock_123');
    showToast('Paiement initié', 'success');
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur', 'error');
  }
}

async function handleCancel(commandeId: string) {
  if (!confirm('Annuler cette commande ?')) return;
  try {
    await store.cancelOrder(commandeId);
    showToast('Commande annulée', 'success');
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur', 'error');
  }
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
