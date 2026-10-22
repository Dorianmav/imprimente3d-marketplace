<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Paramètres</h1>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          :class="activeTab === tab.key ? 'bg-white text-[#12403F] shadow-sm' : 'text-gray-600 hover:text-gray-900'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Profile Tab -->
      <div v-if="activeTab === 'profile'" class="card p-6 space-y-4">
        <h2 class="font-medium text-lg">Profil</h2>

        <!-- Avatar -->
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            <img v-if="profile?.avatarUrl" :src="profile.avatarUrl" class="w-full h-full object-cover" />
            <svg v-else class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <button class="text-sm text-[#12403F] hover:underline">Changer l'avatar</button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input v-model="form.prenom" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input v-model="form.nom" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input :value="profile?.email" disabled class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
        </div>

        <div class="pt-2">
          <button
            @click="saveProfile"
            :disabled="saving"
            class="py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>

      <!-- Security Tab -->
      <div v-if="activeTab === 'security'" class="card p-6 space-y-4">
        <h2 class="font-medium text-lg">Sécurité</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
          <input v-model="passwordForm.current" type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <input v-model="passwordForm.new" type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
          <input v-model="passwordForm.confirm" type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>

        <div class="pt-2">
          <button
            @click="changePassword"
            :disabled="!passwordForm.current || !passwordForm.new || !passwordForm.confirm || saving"
            class="py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ saving ? 'Changement...' : 'Changer le mot de passe' }}
          </button>
        </div>
      </div>

      <!-- CGU Tab -->
      <div v-if="activeTab === 'cgu'" class="card p-6 space-y-4">
        <h2 class="font-medium text-lg">Conditions générales</h2>
        <p class="text-sm text-gray-600">
          En utilisant Layerly, vous acceptez nos conditions générales d'utilisation.
        </p>
        <button
          v-if="!cguAccepted"
          @click="acceptCGU"
          :disabled="saving"
          class="py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Accepter les CGU
        </button>
        <div v-else class="flex items-center gap-2 text-green-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm">CGU acceptées</span>
        </div>
      </div>

      <!-- Export Tab -->
      <div v-if="activeTab === 'export'" class="card p-6 space-y-4">
        <h2 class="font-medium text-lg">Exporter mes données</h2>
        <p class="text-sm text-gray-600">
          Conformément au RGPD, vous pouvez exporter toutes vos données personnelles au format JSON.
        </p>
        <div v-if="exportUrl" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <a :href="exportUrl" download class="text-sm text-green-700 font-medium hover:underline">
            Télécharger mes données (JSON)
          </a>
        </div>
        <button
          v-else
          @click="requestExport"
          :disabled="saving"
          class="py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Préparation...' : 'Demander l\'export' }}
        </button>
      </div>

      <!-- Fiscal Tab -->
      <div v-if="activeTab === 'fiscal'" class="card p-6 space-y-4">
        <h2 class="font-medium text-lg">Informations fiscales</h2>
        <p class="text-sm text-gray-600">
          Ces informations sont nécessaires pour les vendeurs (imprimeurs).
        </p>

        <div v-if="fiscalInfo">
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input v-model="fiscalInfo.siret" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom commercial</label>
              <input v-model="fiscalInfo.nomCommercial" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type de compte</label>
              <select v-model="fiscalInfo.typeCompte" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="particulier">Particulier</option>
                <option value="pro">Professionnel</option>
              </select>
            </div>
          </div>
          <button
            @click="saveFiscal"
            :disabled="saving"
            class="mt-4 py-2 px-6 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
        <div v-else class="text-sm text-gray-500">Aucune information fiscale enregistrée.</div>
      </div>

      <!-- Danger Zone -->
      <div v-if="activeTab === 'danger'" class="card p-6 border border-red-200 space-y-4">
        <h2 class="font-medium text-lg text-red-600">Zone dangereuse</h2>
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Supprimer mon compte</div>
            <div class="text-xs text-gray-500">Cette action est irréversible.</div>
          </div>
          <button
            @click="deleteAccount"
            class="py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApiService } from '~/services/auth.service';

definePageMeta({ middleware: ['auth'] });
setTitle('Paramètres — Layerly');

const { profile, fetchProfile, accessToken } = useAuth();
const { updateProfile, changePassword: apiChangePassword, forgotPassword, resetPassword } = useApiService();
const router = useRouter();

const tabs = [
  { key: 'profile', label: 'Profil' },
  { key: 'security', label: 'Sécurité' },
  { key: 'cgu', label: 'CGU' },
  { key: 'export', label: 'Export données' },
  { key: 'fiscal', label: 'Fiscal' },
  { key: 'danger', label: 'Supprimer' },
];

const activeTab = ref('profile');
const saving = ref(false);

const form = reactive({ prenom: '', nom: '' });
const passwordForm = reactive({ current: '', new: '', confirm: '' });

const cguAccepted = ref(false);
const exportUrl = ref('');
const fiscalInfo = ref<{ siret: string; nomCommercial: string; typeCompte: string } | null>(null);

onMounted(async () => {
  try {
    await fetchProfile();
    if (profile.value) {
      form.prenom = profile.value.prenom;
      form.nom = profile.value.nom;
    }
  } catch { /* ignore */ }
});

async function saveProfile() {
  saving.value = true;
  try {
    await updateProfile(accessToken.value, {
      prenom: form.prenom,
      nom: form.nom,
    });
    await fetchProfile();
    showToast('Profil mis à jour', 'success');
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur lors de la mise à jour', 'error');
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (passwordForm.new !== passwordForm.confirm) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }
  saving.value = true;
  try {
    await apiChangePassword(accessToken.value, passwordForm.current, passwordForm.new);
    showToast('Mot de passe modifié', 'success');
    passwordForm.current = '';
    passwordForm.new = '';
    passwordForm.confirm = '';
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  } finally {
    saving.value = false;
  }
}

async function acceptCGU() {
  saving.value = true;
  try {
    await $fetch(`${useRuntimeConfig().public.apiBase}/auth/me/cgu`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
    cguAccepted.value = true;
    showToast('CGU acceptées', 'success');
  } catch {
    showToast('Erreur', 'error');
  } finally {
    saving.value = false;
  }
}

async function requestExport() {
  saving.value = true;
  try {
    const res = await $fetch(`${useRuntimeConfig().public.apiBase}/users/me/export`, {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
    exportUrl.value = res.url || '';
  } catch {
    showToast('Erreur lors de la demande d\'export', 'error');
  } finally {
    saving.value = false;
  }
}

async function saveFiscal() {
  saving.value = true;
  try {
    await $fetch(`${useRuntimeConfig().public.apiBase}/users/me/fiscal`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        siret: fiscalInfo.value?.siret,
        nomCommercial: fiscalInfo.value?.nomCommercial,
        typeCompte: fiscalInfo.value?.typeCompte,
      },
    });
    showToast('Informations fiscales enregistrées', 'success');
  } catch {
    showToast('Erreur', 'error');
  } finally {
    saving.value = false;
  }
}

async function deleteAccount() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
  saving.value = true;
  try {
    await $fetch(`${useRuntimeConfig().public.apiBase}/users/me`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
    // Clear session
    accessToken.value = null;
    profile.value = null;
    router.push('/');
    showToast('Compte supprimé', 'success');
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  } finally {
    saving.value = false;
  }
}
</script>
