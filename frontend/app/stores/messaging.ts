/**
 * Pinia store for messaging (conversations + messages)
 */
import { useMessagingService } from '~/services/messaging.service';

export const useMessagingStore = defineStore('messaging', () => {
  const conversations = useState<Conversation[]>('messaging.conversations', () => []);
  const activeConversation = useState<string | null>('messaging.activeConversation', () => null);
  const messages = useState<Message[]>('messaging.messages', () => []);
  const loading = useState<boolean>('messaging.loading', () => false);
  const error = useState<string | null>('messaging.error', () => null);

  const service = useMessagingService();
  const { accessToken } = useAuth();

  async function fetchConversations() {
    loading.value = true;
    error.value = null;
    try {
      if (!accessToken.value) return;
      const data = await service.getConversations(accessToken.value, { limit: 50 });
      conversations.value = data;
      return data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch conversations';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMessages(conversationId: string) {
    loading.value = true;
    error.value = null;
    try {
      if (!accessToken.value) return;
      const data = await service.getMessages(accessToken.value, conversationId, { limit: 50 });
      messages.value = data;
      return data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch messages';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function selectConversation(id: string) {
    activeConversation.value = id;
    await fetchMessages(id);
  }

  async function sendMessage(conversationId: string, contenu: string, options?: {
    type?: 'TEXTE' | 'OFFRE' | 'SYSTEME';
    offreId?: string;
    piecesJointes?: string[];
  }) {
    if (!accessToken.value) return;
    const msg = await service.sendMessage(
      accessToken.value,
      conversationId,
      contenu,
      options?.type ?? 'TEXTE',
      options?.offreId,
      options?.piecesJointes
    );
    messages.value.push(msg);
    return msg;
  }

  async function sendOffer(conversationId: string, montant: number, fraisLivraison: number, options?: {
    annonceVenteId?: string;
    parentOffreId?: string;
    expireAt?: string;
  }) {
    if (!accessToken.value) return;
    const offre = await service.sendOffer(
      accessToken.value,
      conversationId,
      montant,
      fraisLivraison,
      options
    );
    messages.value.push({
      id: offre.id,
      conversationId,
      expediteurId: offre.expediteurId,
      expediteur: offre.expediteur,
      type: 'OFFRE',
      contenu: `Proposition: ${formatPrice(offre.montant)} + ${formatPrice(offre.fraisLivraison)} livraison`,
      offreId: offre.id,
      offre,
      piecesJointes: [],
      createdAt: offre.createdAt,
    });
    return offre;
  }

  function clearActive() {
    activeConversation.value = null;
    messages.value = [];
  }

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    selectConversation,
    sendMessage,
    sendOffer,
    clearActive,
  };
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
