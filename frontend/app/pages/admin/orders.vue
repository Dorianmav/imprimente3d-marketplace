<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-6xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Commandes</h1>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterStatut" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous statuts</option>
          <option value="EN_ATTENTE_PAIEMENT">En attente paiement</option>
          <option value="PAYEE">Payée</option>
          <option value="EXPEDIEE">Expédiée</option>
          <option value="LIVREE">Livrée</option>
          <option value="LITIGE">Litige</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- Table -->
      <div v-else-if="orders.length" class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">ID</th>
              <th class="px-4 py-3 font-medium">Acheteur</th>
              <th class="px-4 py-3 font-medium">Vendeur</th>
              <th class="px-4 py-3 font-medium">Total</th>
              <th class="px-4 py-3 font-medium">Statut</th>
              <th class="px-4 py-3 font-medium">Date</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-xs text-gray-500">{{ order.id }}</td>
              <td class="px-4 py-3">{{ order.acheteur?.prenom }} {{ order.acheteur?.nom }}</td>
              <td class="px-4 py-3">{{ order.vendeur?.prenom }} {{ order.vendeur?.nom }}</td>
              <td class="px-4 py-3">{{ formatPrice(order.montantTotalAcheteur) }}</td>
              <td class="px-4 py-3">
                <StatusBadge :status="order.statut" variant="commande" />
              </td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(order.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/orders/${order.id}`"
                  class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                >
                  Voir
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucune commande trouvée.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commande } from '~/types';
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Commandes — Layerly');

const { listOrders, updateOrderStatus } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const orders = ref<Commande[]>([]);
const loading = ref(true);
const filterStatut = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadOrders();
  } finally {
    loading.value = false;
  }
});

async function loadOrders() {
  try {
    const params: any = {};
    if (filterStatut.value) params.statut = filterStatut.value;
    const res = await listOrders(accessToken.value, params);
    orders.value = Array.isArray(res?.orders || res) ? res.orders || res : [];
  } catch {
    // ignore
  }
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
