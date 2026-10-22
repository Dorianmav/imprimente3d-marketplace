<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-6xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Messagerie</h1>

      <div class="grid md:grid-cols-[320px_1fr] gap-4" style="height: calc(100vh - 200px)">
        <!-- Conversations list -->
        <div class="card overflow-y-auto">
          <div class="p-3 border-b border-gray-100">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher une conversation..."
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
            />
          </div>

          <div v-if="messaging.loading" class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-200 skeleton shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-gray-200 rounded skeleton w-1/2" />
                <div class="h-3 bg-gray-200 rounded skeleton w-2/3" />
              </div>
            </div>
          </div>

          <div v-else class="divide-y divide-gray-50">
            <button
              v-for="conv in filteredConversations"
              :key="conv.id"
              @click="selectConversation(conv.id)"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              :class="messaging.activeConversation === conv.id ? 'bg-primary-container/5' : ''"
            >
              <div class="relative shrink-0">
                <UAvatar :src="getConversationAvatar(conv)" size="sm" />
                <span
                  v-if="(conv.unreadCount || 0) > 0"
                  class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                >
                  {{ conv.unreadCount }}
                </span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-sm truncate">
                    {{ getParticipantName(conv) }}
                  </span>
                  <span class="text-xs text-gray-400 shrink-0 ml-2">
                    {{ formatTime(conv.lastMessage?.createdAt || conv.createdAt) }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 truncate">
                  {{ conv.lastMessage?.contenu || 'Nouvelle conversation' }}
                </div>
              </div>
            </button>

            <div v-if="!messaging.conversations.length" class="p-8 text-center text-gray-500 text-sm">
              Aucune conversation
            </div>
          </div>
        </div>

        <!-- Chat area -->
        <div class="card flex flex-col overflow-hidden">
          <template v-if="!messaging.activeConversation">
            <div class="flex-1 flex items-center justify-center text-gray-400">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Choisissez une conversation</p>
              </div>
            </div>
          </template>

          <template v-else>
            <!-- Chat header -->
            <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <UAvatar :src="getChatPartner()?.avatarUrl" size="sm" />
              <span class="font-medium">{{ getChatPartnerName() }}</span>
              <div class="flex-1" />

              <!-- Block/unblock dropdown -->
              <div v-if="chatPartner" class="relative">
                <button @click="showBlockMenu = !showBlockMenu" class="p-1 hover:bg-gray-100 rounded transition-colors">
                  <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                <div v-if="showBlockMenu" class="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10">
                  <button
                    @click="handleBlock"
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-red-600"
                  >
                    {{ isBlocked ? 'Débloquer' : 'Bloquer' }} {{ chatPartner.prenom }}
                  </button>
                  <button
                    @click="handleReport"
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-orange-600"
                  >
                    Signaler
                  </button>
                </div>
              </div>

              <button @click="messaging.clearActive" class="p-1 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Messages -->
            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div
                v-for="msg in messaging.messages"
                :key="msg.id"
                class="flex"
                :class="msg.expediteurId === currentUserId ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[75%] rounded-2xl px-4 py-2"
                  :class="msg.expediteurId === currentUserId
                    ? 'bg-primary-container text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'"
                >
                  <!-- Offer message -->
                  <div v-if="msg.type === 'OFFRE'" class="mb-2">
                    <div class="text-xs opacity-75">Proposition</div>
                    <div class="font-bold text-lg">{{ formatPrice(msg.offre?.montant || 0) }}</div>
                    <div class="text-xs opacity-75">+ {{ formatPrice(msg.offre?.fraisLivraison || 0) }} livraison</div>
                  </div>

                  <!-- Text -->
                  <p class="text-sm whitespace-pre-wrap">{{ msg.contenu }}</p>

                  <div class="text-[10px] mt-1 opacity-60 flex items-center gap-1 justify-end">
                    {{ formatTime(msg.createdAt) }}
                  </div>
                </div>
              </div>

              <div v-if="messaging.loading" class="flex justify-start">
                <div class="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                  <div class="flex gap-1">
                    <div class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay: 0ms" />
                    <div class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay: 150ms" />
                    <div class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay: 300ms" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Message input -->
            <div class="p-3 border-t border-gray-100">
              <form @submit.prevent="handleSend" class="flex items-center gap-2">
                <input
                  v-model="messageInput"
                  type="text"
                  placeholder="Votre message..."
                  class="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
                />
                <button
                  type="submit"
                  class="p-2.5 rounded-full bg-primary-container text-white hover:bg-primary transition-colors"
                  :disabled="!messageInput.trim()"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Block/Unblock modal -->
    <BlockUserModal
      v-model="showBlockModal"
      :user-name="chatPartner?.prenom || ''"
      :is-blocked="isBlocked"
      @confirm="handleBlockConfirm"
    />
  </div>
</template>

<script setup lang="ts">
const messaging = useMessagingStore();
const { profile } = useAuth();
const { showToast } = useToast();
const userService = useUserService();

const searchQuery = ref('');
const messageInput = ref('');
const showBlockMenu = ref(false);
const isBlocked = ref(false);
const showBlockModal = ref(false);

const currentUserId = computed(() => profile.value?.id || '');

const chatPartner = computed(() => {
  const conv = messaging.conversations.find(c => c.id === messaging.activeConversation);
  if (!conv) return undefined;
  if (conv.initiateurId === currentUserId.value) return conv.destinataire;
  return conv.initiateur;
});

function getOtherUser(conv: Conversation): User | undefined {
  // The other user is whoever is not the current user
  if (conv.initiateurId === currentUserId.value) return conv.destinataire;
  return conv.initiateur;
}

function getConversationAvatar(conv: Conversation): string | null {
  const other = getOtherUser(conv);
  return other?.avatarUrl || null;
}

function getParticipantName(conv: Conversation): string {
  const other = getOtherUser(conv);
  return other ? `${other.prenom} ${other.nom}` : 'Inconnu';
}

function getChatPartner(): User | undefined {
  const conv = messaging.conversations.find(c => c.id === messaging.activeConversation);
  return conv ? getOtherUser(conv) : undefined;
}

function getChatPartnerName(): string {
  const partner = getChatPartner();
  return partner ? `${partner.prenom} ${partner.nom}` : 'Inconnu';
}

function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function selectConversation(id: string) {
  messaging.selectConversation(id);
}

async function handleSend() {
  if (!messageInput.value.trim() || !messaging.activeConversation) return;
  await messaging.sendMessage(messaging.activeConversation, messageInput.value.trim());
  messageInput.value = '';
}

const filteredConversations = computed(() => {
  if (!searchQuery.value) return messaging.conversations;
  const q = searchQuery.value.toLowerCase();
  return messaging.conversations.filter(conv => {
    const other = getOtherUser(conv);
    return other?.prenom.toLowerCase().includes(q) ||
           other?.nom.toLowerCase().includes(q) ||
           conv.lastMessage?.contenu.toLowerCase().includes(q);
  });
});

function handleBlock() {
  showBlockMenu.value = false;
  showBlockModal.value = true;
}

async function handleBlockConfirm(payload: { userId: string; reason: string }) {
  try {
    if (!profile.value?.id) return;
    if (isBlocked.value) {
      await useUserService().unblockUser(null, payload.userId);
      isBlocked.value = false;
      showToast('Utilisateur débloqué', 'success');
    } else {
      await useUserService().blockUser(null, payload.userId, payload.reason);
      isBlocked.value = true;
      showToast('Utilisateur bloqué', 'success');
    }
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

function handleReport() {
  showBlockMenu.value = false;
  // TODO: Open report modal (existing messaging report functionality)
  showToast('Signalement à venir', 'info');
}

watch(showBlockMenu, (val) => {
  if (!val) showBlockMenu.value = false; // close after click
});

onMounted(() => {
  messaging.fetchConversations();
});
</script>
