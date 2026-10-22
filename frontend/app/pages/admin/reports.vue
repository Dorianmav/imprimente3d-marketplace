<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Signalements</h1>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filterStatut" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Tous statuts</option>
          <option value="OUVERT">Ouvert</option>
          <option value="EN_COURS">En cours</option>
          <option value="TRAITE">Traité</option>
          <option value="REJETE">Rejeté</option>
        </select>
        <select v-model="filterCible" class="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Toutes cibles</option>
          <option value="ANNONCE_VENTE">Vente</option>
          <option value="ANNONCE_DEMANDE">Demande</option>
          <option value="UTILISATEUR">Utilisateur</option>
          <option value="MESSAGE">Message</option>
          <option value="AVIS">Avis</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-gray-200 rounded skeleton" />
      </div>

      <!-- List -->
      <div v-else-if="reports.length" class="space-y-3">
        <div
          v-for="report in reports"
          :key="report.id"
          class="card p-4 space-y-2"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <StatusBadge :status="report.statut" variant="signalement" />
                <span class="text-sm font-medium">{{ cibleLabel(report.cibleType) }}</span>
              </div>
              <div class="text-sm">{{ motifLabel(report.motif) }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ report.description }}</div>
              <div class="text-xs text-gray-400 mt-1">
                Signalé par {{ report.signaleur?.prenom }} {{ report.signaleur?.nom }}
                · {{ formatDate(report.createdAt) }}
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <button
                v-if="report.statut !== 'TRAITE'"
                @click="actionReport(report.id, 'EN_COURS')"
                class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                En cours
              </button>
              <button
                v-if="report.statut !== 'TRAITE'"
                @click="actionReport(report.id, 'TRAITE')"
                class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Traiter
              </button>
              <button
                v-if="report.statut !== 'REJETE' && report.statut !== 'TRAITE'"
                @click="actionReport(report.id, 'REJETE')"
                class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Aucun signalement.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Signalements — Layerly');

const { listReports, actionReport: adminActionReport } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const reports = ref<any[]>([]);
const loading = ref(true);
const filterStatut = ref('');
const filterCible = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadReports();
  } finally {
    loading.value = false;
  }
});

async function loadReports() {
  try {
    const params: any = {};
    if (filterStatut.value) params.statut = filterStatut.value;
    if (filterCible.value) params.cibleType = filterCible.value;
    const res = await listReports(accessToken.value, params);
    reports.value = Array.isArray(res?.reports || res) ? res.reports || res : [];
  } catch {
    // ignore
  }
}

async function actionReport(reportId: string, statut: string) {
  try {
    await adminActionReport(
      accessToken.value,
      reportId,
      statut,
      statut === 'TRAITE' ? 'APPROUVED' : 'REJECTED',
      '',
      accessToken.value // adminId placeholder
    );
    showToast('Signalement mis à jour', 'success');
    await loadReports();
  } catch (err: any) {
    showToast(err?.data?.message || 'Erreur', 'error');
  }
}

function cibleLabel(type: string): string {
  const map: Record<string, string> = {
    ANNONCE_VENTE: 'Vente',
    ANNONCE_DEMANDE: 'Demande',
    UTILISATEUR: 'Utilisateur',
    MESSAGE: 'Message',
    CONVERSATION: 'Conversation',
    AVIS: 'Avis',
  };
  return map[type] || type;
}

function motifLabel(motif: string): string {
  const map: Record<string, string> = {
    ILLOCITE: 'Contenu illicite',
    ARME: 'Arme',
    CONTREFACON: 'Contrefaçon',
    ARNAQUE: 'Arnaque',
    HARCELEMENT: 'Harcèlement',
    SPAM: 'Spam',
    CONTENU_INAPPROPRIE: 'Contenu inapproprié',
    AUTRE: 'Autre',
  };
  return map[motif] || motif;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
