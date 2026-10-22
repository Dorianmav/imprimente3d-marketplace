<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/admin/reports" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Retour aux signalements</NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Admin — Signalement</h1>

      <template v-if="report">
        <!-- Status -->
        <div class="card p-4 mb-6">
          <div class="flex items-center gap-2 mb-2">
            <StatusBadge :status="report.statut" variant="signalement" />
            <span class="text-sm text-gray-500">{{ cibleLabel(report.cibleType) }}</span>
          </div>
          <div class="text-xs text-gray-400">
            Signalé le {{ formatDate(report.createdAt) }}
          </div>
        </div>

        <!-- Details -->
        <div class="card p-4 mb-6 space-y-4">
          <div>
            <h3 class="font-medium text-sm mb-1">Motif</h3>
            <p class="text-sm">{{ motifLabel(report.motif) }}</p>
          </div>
          <div>
            <h3 class="font-medium text-sm mb-1">Description</h3>
            <p class="text-sm text-gray-700">{{ report.description }}</p>
          </div>
          <div>
            <h3 class="font-medium text-sm mb-1">Signalé par</h3>
            <p class="text-sm">{{ report.signaleur?.prenom }} {{ report.signaleur?.nom }}</p>
            <p class="text-xs text-gray-400">{{ report.signaleur?.email }}</p>
          </div>

          <!-- Cible details -->
          <div v-if="report.cible" class="bg-gray-50 p-3 rounded-lg">
            <h3 class="font-medium text-sm mb-2">Cible du signalement</h3>
            <div v-if="report.cibleType === 'ANNONCE_VENTE'" class="space-y-1 text-sm">
              <p><span class="font-medium">Titre:</span> {{ report.cible.titre }}</p>
              <p><span class="font-medium">Vendeur:</span> {{ report.cible.vendeur?.prenom }} {{ report.cible.vendeur?.nom }}</p>
              <p><span class="font-medium">Prix:</span> {{ formatPrice(report.cible.prixProduit) }}</p>
            </div>
            <div v-else-if="report.cibleType === 'ANNONCE_DEMANDE'" class="space-y-1 text-sm">
              <p><span class="font-medium">Titre:</span> {{ report.cible.titre }}</p>
              <p><span class="font-medium">Acheteur:</span> {{ report.cible.acheteur?.prenom }} {{ report.cible.acheteur?.nom }}</p>
              <p><span class="font-medium">Budget:</span> {{ formatPrice(report.cible.budgetMax || 0) }}</p>
            </div>
            <div v-else-if="report.cibleType === 'UTILISATEUR'" class="space-y-1 text-sm">
              <p><span class="font-medium">Nom:</span> {{ report.cible.prenom }} {{ report.cible.nom }}</p>
              <p><span class="font-medium">Email:</span> {{ report.cible.email }}</p>
              <p><span class="font-medium">Type:</span> {{ report.cible.typeCompte }}</p>
            </div>
            <div v-else-if="report.cibleType === 'MESSAGE'" class="space-y-1 text-sm">
              <p><span class="font-medium">Contenu:</span> {{ report.cible.contenu }}</p>
              <p><span class="font-medium">Expéditeur:</span> {{ report.cible.expediteur?.prenom }} {{ report.cible.expediteur?.nom }}</p>
            </div>
            <div v-else-if="report.cibleType === 'AVIS'" class="space-y-1 text-sm">
              <p><span class="font-medium">Commentaire:</span> {{ report.cible.commentaire }}</p>
              <p><span class="font-medium">Note:</span> {{ '★'.repeat(report.cible.note) }}{{ '☆'.repeat(5 - report.cible.note) }}</p>
            </div>
            <div v-else class="text-sm">
              <p>{{ JSON.stringify(report.cible) }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="report.statut !== 'TRAITE' && report.statut !== 'REJETE'" class="card p-6 mb-6">
          <h2 class="font-sora font-bold text-xl mb-4">Traitement</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Note admin (optionnelle)</label>
              <textarea
                v-model="noteAdmin"
                rows="3"
                class="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Note interne..."
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                @click="actionAction('EN_COURS')"
                class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                Marquer en cours
              </button>
              <button
                @click="actionAction('TRAITE')"
                class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                Traiter
              </button>
              <button
                @click="actionAction('REJETE')"
                class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>

        <!-- Resolved status -->
        <div v-if="report.statut === 'TRAITE' || report.statut === 'REJETE'" class="card p-6 mb-6" :class="report.statut === 'TRAITE' ? 'bg-green-50' : 'bg-red-50'">
          <h2 class="font-sora font-bold text-xl mb-2" :class="report.statut === 'TRAITE' ? 'text-green-700' : 'text-red-700'">
            {{ report.statut === 'TRAITE' ? 'Signalement traité' : 'Signalement rejeté' }}
          </h2>
        </div>
      </template>

      <!-- Loading -->
      <div v-else-if="loading" class="space-y-4">
        <div class="h-24 bg-gray-200 rounded skeleton" />
        <div class="h-32 bg-gray-200 rounded skeleton" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminService } from '~/services/litige.service';
import StatusBadge from '~/components/StatusBadge.vue';

definePageMeta({ middleware: ['admin'] });
setTitle('Admin — Signalement — Layerly');

const route = useRoute();
const { getReportDetail, actionReport } = useAdminService();
const { accessToken, fetchProfile } = useAuth();

const report = ref<any | null>(null);
const loading = ref(true);
const noteAdmin = ref('');

onMounted(async () => {
  try {
    await fetchProfile();
    await loadReport();
  } finally {
    loading.value = false;
  }
});

async function loadReport() {
  const id = route.params.id as string;
  try {
    const res = await getReportDetail(accessToken.value, id);
    report.value = res?.report || res;
  } catch {
    showToast('Erreur chargement signalement', 'error');
  }
}

async function actionAction(statut: string) {
  const id = route.params.id as string;
  try {
    await actionReport(
      accessToken.value,
      id,
      statut,
      statut === 'TRAITE' ? 'APPROVED' : 'REJECTED',
      noteAdmin.value,
      accessToken.value // adminId placeholder
    );
    showToast('Signalement mis à jour', 'success');
    await loadReport();
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

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>
