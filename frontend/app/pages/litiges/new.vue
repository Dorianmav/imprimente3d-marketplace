<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/orders" class="text-sm text-[#12403F] hover:underline mb-4 inline-block">
        ← Retour aux commandes
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Ouvrir un litige</h1>

      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Order info -->
          <div class="p-3 bg-gray-50 rounded-lg">
            <div class="text-sm font-medium">Commande #{{ commande?.id }}</div>
            <div class="text-xs text-gray-500 mt-1">
              Total: {{ formatPrice(commande?.montantTotalAcheteur || 0) }}
              · Statut: {{ commande?.statut }}
            </div>
          </div>

          <!-- Motif -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <select v-model="motif" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Sélectionner un motif</option>
              <option value="NON_RECU">Je n'ai pas reçu la commande</option>
              <option value="NON_CONFORME">Article non conforme à la description</option>
              <option value="ENDOMMAGE">Article endommagé</option>
              <option value="AUTRE">Autre motif</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea
              v-model="description"
              required
              rows="4"
              placeholder="Décrivez votre problème en détail..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <!-- Photos -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Photos (facultatif)
            </label>
            <div class="flex items-center gap-2">
              <label class="cursor-pointer">
                <span class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors inline-block">
                  Ajouter des photos
                </span>
                <input type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
              </label>
            </div>
            <div v-if="photos.length" class="mt-2 flex flex-wrap gap-2">
              <div v-for="(photo, idx) in photos" :key="idx" class="relative">
                <img :src="photo.preview" class="w-16 h-16 object-cover rounded" />
                <button
                  @click="removePhoto(idx)"
                  class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Ouverture en cours...' : 'Ouvrir le litige' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commande } from '~/types';
import { useLitigeService } from '~/services/litige.service';

definePageMeta({ middleware: ['auth'] });
setTitle('Ouvrir un litige — Layerly');

const route = useRoute();
const router = useRouter();
const { openDispute } = useLitigeService();
const { accessToken, fetchProfile } = useAuth();

const commande = ref<Commande | null>(null);
const motif = ref('');
const description = ref('');
const photos: { file: File; preview: string }[] = [];
const loading = ref(false);

onMounted(async () => {
  try {
    await fetchProfile();
    if (route.params.commandeId) {
      // Fetch command details - using commande service
      const config = useRuntimeConfig();
      commande.value = await $fetch(`${config.public.apiBase}/commandes/${route.params.commandeId}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });
    }
  } catch {
    // ignore
  }
});

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    Array.from(target.files).forEach(file => {
      const preview = URL.createObjectURL(file);
      photos.value.push({ file, preview });
    });
  }
}

function removePhoto(idx: number) {
  URL.revokeObjectURL(photos.value[idx].preview);
  photos.value.splice(idx, 1);
}

async function handleSubmit() {
  if (!route.params.commandeId) return;
  loading.value = true;

  try {
    const photoUrls = photos.value.map(p => p.preview); // In production, upload to storage first
    await openDispute(accessToken.value, route.params.commandeId as string, motif.value, description.value, photoUrls);
    showToast('Litige ouvert avec succès', 'success');
    router.push(`/litiges`);
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur lors de l\'ouverture du litige', 'error');
  } finally {
    loading.value = false;
  }
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}
</script>
