<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-6xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Utilisateurs</h1>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <input
          v-model="search"
          placeholder="Rechercher par email ou nom..."
          class="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[200px]"
        />
        <select v-model="filterStatus" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous</option>
          <option value="ACTIF">Actif</option>
          <option value="SUSPENDU">Suspendu</option>
          <option value="INACTIF">Inactif</option>
        </select>
        <select v-model="filterRole" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous les rôles</option>
          <option value="ADMIN">Admin</option>
          <option value="VENDEUR">Vendeur</option>
          <option value="ACHETEUR">Acheteur</option>
          <option value="IMPRIMEUR">Imprimeur</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- Table -->
      <div v-else-if="users.length" class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">Utilisateur</th>
              <th class="px-4 py-3 font-medium">Email</th>
              <th class="px-4 py-3 font-medium">Rôle</th>
              <th class="px-4 py-3 font-medium">Statut</th>
              <th class="px-4 py-3 font-medium">Inscription</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium">{{ user.prenom }} {{ user.nom }}</div>
                <div class="text-xs text-gray-400">ID: {{ user.id }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ user.email }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">{{ user.role }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs" :class="statusClass(user.statut)">
                  {{ user.statut }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(user.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/profile/${user.id}`"
                    class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Profil
                  </NuxtLink>
                  <button
                    v-if="user.statut !== 'SUSPENDU'"
                    @click="handleSuspendUser(user.id)"
                    class="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                  >
                    Suspendre
                  </button>
                  <button
                    v-else
                    @click="handleUnsuspendUser(user.id)"
                    class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Réactiver
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucun utilisateur trouvé.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Utilisateurs — Layerly');

const { listUsers, suspendUser: adminSuspendUser, unsuspendUser: adminUnsuspendUser } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const users = ref<any[]>([]);
const loading = ref(true);
const search = ref('');
const filterStatus = ref('');
const filterRole = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadUsers();
  } finally {
    loading.value = false;
  }
});

async function loadUsers() {
  try {
    const params: any = {};
    if (filterStatus.value) params.statut = filterStatus.value;
    if (filterRole.value) params.role = filterRole.value;
    const res = await listUsers(accessToken.value, params);
    users.value = Array.isArray(res?.users || res) ? res.users || res : [];
  } catch {
    // ignore
  }
}

async function handleSuspendUser(userId: string) {
  try {
    await adminSuspendUser(accessToken.value, userId);
    showToast('Utilisateur suspendu', 'success');
    await loadUsers();
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

async function handleUnsuspendUser(userId: string) {
  try {
    await adminUnsuspendUser(accessToken.value, userId);
    showToast('Utilisateur réactivé', 'success');
    await loadUsers();
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

function statusClass(s: string): string {
  const map: Record<string, string> = {
    ACTIF: 'bg-green-100 text-green-700',
    SUSPENDU: 'bg-red-100 text-red-700',
    INACTIF: 'bg-gray-100 text-gray-600',
  };
  return map[s] || 'bg-gray-100 text-gray-600';
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
