<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Tableau de bord</h1>

      <template v-if="profile">
        <!-- Welcome -->
        <div class="card p-6 mb-6 bg-gradient-to-br from-[#12403F] to-[#3b6564] text-white">
          <h2 class="font-sora font-bold text-xl mb-1">
            Bonjour, {{ profile.prenom }} !
          </h2>
          <p class="text-white/80 text-sm">
            Bienvenue sur votre tableau de bord Layerly
          </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="card p-4 text-center">
            <div class="font-sora font-bold text-2xl text-primary-container">{{ stats.ventes }}</div>
            <div class="text-xs text-gray-500 mt-0.5">Ventes</div>
          </div>
          <div class="card p-4 text-center">
            <div class="font-sora font-bold text-2xl text-primary-container">{{ stats.commandes }}</div>
            <div class="text-xs text-gray-500 mt-0.5">Commandes</div>
          </div>
          <div class="card p-4 text-center">
            <div class="font-sora font-bold text-2xl text-primary-container">{{ stats.messages }}</div>
            <div class="text-xs text-gray-500 mt-0.5">Messages</div>
          </div>
          <div class="card p-4 text-center">
            <div class="font-sora font-bold text-2xl text-amber-500">{{ profile.noteMoyenne?.toFixed(1) ?? '—' }}</div>
            <div class="text-xs text-gray-500 mt-0.5">Note</div>
          </div>
        </div>

        <!-- Quick links -->
        <div class="grid md:grid-cols-2 gap-3">
          <NuxtLink to="/ventes/new" class="card p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">Nouvelle vente</div>
              <div class="text-xs text-gray-500">Publier un modèle 3D</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/demandes/new" class="card p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">Nouvelle demande</div>
              <div class="text-xs text-gray-500">Demander une impression</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/orders" class="card p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">Mes commandes</div>
              <div class="text-xs text-gray-500">Suivi des commandes</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/messages" class="card p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">Messagerie</div>
              <div class="text-xs text-gray-500">Conversations</div>
            </div>
          </NuxtLink>
        </div>
      </template>

      <!-- Loading -->
      <div v-else-if="loading" class="space-y-4">
        <div class="h-24 bg-gray-200 rounded skeleton" />
        <div class="grid grid-cols-4 gap-3">
          <div v-for="i in 4" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { profile, fetchProfile } = useAuth();
const loading = ref(true);

const stats = ref({
  ventes: 0,
  commandes: 0,
  messages: 0,
});

onMounted(async () => {
  try {
    await fetchProfile();
    // Fetch stats (simplified - in a real app, fetch from API)
  } finally {
    loading.value = false;
  }
});
</script>
