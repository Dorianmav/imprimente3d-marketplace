<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Mes avis reçus</h1>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-24 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="reviews.length" class="space-y-3">
        <div v-for="review in reviews" :key="review.id" class="card p-4">
          <div class="flex items-center gap-3 mb-2">
            <UAvatar :src="review.auteur?.avatarUrl" :alt="review.auteur?.prenom" size="sm" />
            <div class="flex-1">
              <span class="font-medium text-sm">{{ review.auteur?.prenom }} {{ review.auteur?.nom }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ formatDate(review.publieAt || review.createdAt) }}</span>
            </div>
            <div class="flex items-center gap-0.5">
              <svg v-for="s in review.note" :key="s" class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs px-2 py-0.5 rounded-full" :class="review.type === 'ACHETEUR_VERS_VENDEUR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
              {{ review.type === 'ACHETEUR_VERS_VENDEUR' ? 'Avis acheteur' : 'Avis vendeur' }}
            </span>
          </div>
          <p v-if="review.commentaire" class="text-sm text-gray-700">{{ review.commentaire }}</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p class="text-gray-500">Aucun avis reçu pour le moment.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAvisService } from '~/services/avis.service';

setTitle('Mes avis reçus — Layerly');

const { getReceived } = useAvisService();
const { accessToken, fetchProfile } = useAuth();

const reviews = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    await fetchProfile();
    const data = await getReceived(accessToken.value);
    reviews.value = data || [];
  } catch {
    showToast('Erreur chargement avis', 'error');
  } finally {
    loading.value = false;
  }
});

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
