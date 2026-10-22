/**
 * Pinia store for orders
 */
import { useCommandeService } from '~/services/commande.service';

export const useOrdersStore = defineStore('orders', () => {
  const orders = useState<Commande[]>('orders.list', () => []);
  const ordersMeta = useState<{ total: number; hasMore: boolean } | null>('orders.meta', () => null);
  const activeOrder = useState<Commande | null>('orders.activeOrder', () => null);
  const loading = useState<boolean>('orders.loading', () => false);
  const error = useState<string | null>('orders.error', () => null);

  const service = useCommandeService();
  const { accessToken } = useAuth();

  async function fetchMyOrders(role: 'acheteur' | 'vendeur' = 'acheteur', statut?: string) {
    loading.value = true;
    error.value = null;
    try {
      if (!accessToken.value) return;
      const result = await service.getMyOrders(accessToken.value, { role, statut });
      orders.value = result.commandes;
      ordersMeta.value = { total: result.total, hasMore: result.hasMore };
      return result;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch orders';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOrder(id: string) {
    loading.value = true;
    error.value = null;
    try {
      if (!accessToken.value) return;
      const order = await service.findById(accessToken.value, id);
      activeOrder.value = order;
      return order;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch order';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createOrder(dto: {
    sourceType: string;
    sourceId: string;
    quantite?: number;
    modeLivraison: string;
    adresseLivraison?: unknown;
  }) {
    if (!accessToken.value) throw new Error('Not authenticated');
    return service.create(accessToken.value, dto);
  }

  async function confirmPayment(id: string, stripePaymentIntentId: string) {
    if (!accessToken.value) throw new Error('Not authenticated');
    const order = await service.confirmPayment(accessToken.value, id, stripePaymentIntentId);
    if (activeOrder.value?.id === id) {
      activeOrder.value = order;
    }
    return order;
  }

  async function confirmReceipt(id: string) {
    if (!accessToken.value) throw new Error('Not authenticated');
    const order = await service.confirmReceipt(accessToken.value, id);
    if (activeOrder.value?.id === id) {
      activeOrder.value = order;
    }
    return order;
  }

  async function cancelOrder(id: string, motif?: string) {
    if (!accessToken.value) throw new Error('Not authenticated');
    const order = await service.cancelOrder(accessToken.value, id, motif);
    if (activeOrder.value?.id === id) {
      activeOrder.value = order;
    }
    return order;
  }

  function clearActive() {
    activeOrder.value = null;
  }

  return {
    orders,
    ordersMeta,
    activeOrder,
    loading,
    error,
    fetchMyOrders,
    fetchOrder,
    createOrder,
    confirmPayment,
    confirmReceipt,
    cancelOrder,
    clearActive,
  };
});
