<template>
  <!-- Desktop Top Nav -->
  <header class="hidden md:flex sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <div class="max-w-7xl mx-auto w-full px-4 h-14 flex items-center justify-between">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2">
        <span class="font-sora font-bold text-xl text-primary-container">Layerly</span>
      </NuxtLink>

      <!-- Search -->
      <div class="flex-1 max-w-md mx-6">
        <SearchBar placeholder="Rechercher un modèle 3D, un service..." />
      </div>

      <!-- Nav actions -->
      <nav class="flex items-center gap-2">
        <NuxtLink to="/demandes/new" class="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-container transition-colors">
          Nouvelle demande
        </NuxtLink>

        <UDropdownMenu
          :items="[[{ label: 'Mes commandes', avatar: { src: '', alt: '' }, onSelect: () => navigateTo('/orders') }]]"
          :popper="{ placement: 'bottom-end' }"
        >
          <button class="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span v-if="store.unreadCount > 0" class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </UDropdownMenu>

        <UDropdownMenu
          :items="profileDropdownItems"
          :popper="{ placement: 'bottom-end' }"
        >
          <button class="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <UAvatar
              :src="profile?.avatarUrl"
              :alt="profile?.prenom || 'U'"
              size="sm"
            />
          </button>
        </UDropdownMenu>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useNotificationsStore } from '~/stores/notifications';
import { useAuth } from '~/composables/useAuth';

const { profile, fetchProfile } = useAuth();
const store = useNotificationsStore();

// Fetch profile on mount
onMounted(async () => {
  if (profile.value) return;
  try { await fetchProfile(); } catch { /* ignore */ }
});

// Fetch notifications periodically
onMounted(() => {
  store.fetchUnreadCount();
  const interval = setInterval(() => store.fetchUnreadCount(), 30000);
  return () => clearInterval(interval);
});

const profileDropdownItems = computed(() => {
  if (!profile.value) return [];
  const items = [
    [
      { label: profile.value.prenom + ' ' + profile.value.nom, avatar: { src: profile.value.avatarUrl || '', alt: profile.value.prenom || 'U' } },
    ],
    [
      { label: 'Mon profil', icon: 'mdi-account', click: () => navigateTo(`/profile/me`) },
      { label: 'Mes ventes', icon: 'mdi-cube', click: () => navigateTo(`/profile/me?tab=ventes`) },
      { label: 'Mes demandes', icon: 'mdi-pencil', click: () => navigateTo(`/profile/me?tab=demandes`) },
      { label: 'Mes devis', icon: 'mdi-file-document', click: () => navigateTo('/devis/my') },
      { label: 'Mes commandes', icon: 'mdi-shopping', click: () => navigateTo('/orders') },
      { label: 'Messagerie', icon: 'mdi-message', click: () => navigateTo('/messages') },
      { label: 'Mes avis reçus', icon: 'mdi-star', click: () => navigateTo('/avis/received') },
      { label: 'Mes litiges', icon: 'mdi-shield-alert', click: () => navigateTo('/litiges') },
    ],
    [
      { label: 'Paramètres', icon: 'mdi-cog', click: () => navigateTo('/settings') },
      { label: 'Se déconnecter', icon: 'mdi-logout', click: () => navigateTo('/login'), class: 'text-red-600' },
    ],
  ] as any[][];

  // Add admin section for admins
  if (profile.value.role === 'ADMIN') {
    items.splice(items.length - 1, 0, [
      { label: 'Tableau de bord admin', icon: 'mdi-shield-account', click: () => navigateTo('/dashboard') },
      { label: 'Utilisateurs', icon: 'mdi-account-group', click: () => navigateTo('/admin/users') },
      { label: 'Listes', icon: 'mdi-format-list-checks', click: () => navigateTo('/admin/listings') },
      { label: 'Commandes', icon: 'mdi-shopping', click: () => navigateTo('/admin/orders') },
      { label: 'Litiges', icon: 'mdi-shield-alert', click: () => navigateTo('/admin/litiges') },
      { label: 'Signalements', icon: 'mdi-flag', click: () => navigateTo('/admin/reports') },
      { label: 'Imprimeurs', icon: 'mdi-printer', click: () => navigateTo('/admin/imprimeurs') },
      { label: 'Devis', icon: 'mdi-file-document-outline', click: () => navigateTo('/admin/devis') },
    ]);
  }

  return items;
});
</script>
