<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-sora font-bold text-2xl md:text-3xl">Admin — Imprimeurs</h1>
        <button @click="loadImprimeurs" class="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          Recharger
        </button>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterActif" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option :value="null">Tous</option>
          <option :value="true">Actifs</option>
          <option :value="false">Inactifs</option>
        </select>
        <select v-model="filterDisponible" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option :value="null">Disponibilité</option>
          <option :value="true">Disponibles</option>
          <option :value="false">Indisponibles</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-24 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="imprimeurs.length" class="space-y-3">
        <div
          v-for="imprimeur in imprimeurs"
          :key="imprimeur.userId"
          class="card p-4 space-y-2"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">{{ imprimeur.prenom }} {{ imprimeur.nom }}</span>
                <span class="text-xs text-gray-400">{{ imprimeur.email }}</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <StatusBadge :status="imprimeur.statut" variant="user" />
                <span class="text-xs" :class="imprimeur.disponible ? 'text-green-600' : 'text-red-500'">
                  {{ imprimeur.disponible ? 'Disponible' : 'Indisponible' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Matériaux: {{ imprimeur.materiaux?.join(', ') || '—' }}
              </div>
            </div>
            <button
              @click="toggleDisponibilite(imprimeur.userId, !imprimeur.disponible)"
              class="px-3 py-1.5 text-sm rounded-lg transition-colors"
              :class="imprimeur.disponible
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'"
            >
              {{ imprimeur.disponible ? 'Indisponible' : 'Disponible' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucun imprimeur trouvé.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Imprimeurs — Layerly');

const { listImprimeurs, toggleImprimeur } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const imprimeurs = ref<any[]>([]);
const loading = ref(true);
const filterActif = ref<boolean | null>(null);
const filterDisponible = ref<boolean | null>(null);

onMounted(async () => {
  try {
    await fetchProfile();
    await loadImprimeurs();
  } finally {
    loading.value = false;
  }
});

async function loadImprimeurs() {
  try {
    const params: any = {};
    if (filterActif.value != null) params.actif = filterActif.value;
    if (filterDisponible.value != null) params.disponible = filterDisponible.value;
    const res = await listImprimeurs(accessToken.value, params);
    imprimeurs.value = res?.imprimeurs || res?.data || [];
  } catch {
    showToast('Erreur chargement imprimeurs', 'error');
  }
}

async function toggleDisponibilite(userId: string, disponible: boolean) {
  try {
    await toggleImprimeur(accessToken.value, userId, disponible);
    const idx = imprimeurs.value.findIndex(i => i.userId === userId);
    if (idx !== -1) {
      imprimeurs.value[idx].disponible = disponible;
    }
    showToast(disponible ? 'Imprimeur disponible' : 'Imprimeur indisponible', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}
</script>
