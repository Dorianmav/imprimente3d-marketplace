<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-container mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour à l'accueil
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Soumettre une proposition</h1>

      <!-- Demande summary -->
      <div v-if="demande" class="card p-4 mb-6 border border-gray-100">
        <div class="flex items-center gap-2 mb-2">
          <MaterialBadge :materiau="demande.materiauSouhaite" />
          <span class="text-xs text-gray-500">{{ demande.categorie }}</span>
        </div>
        <h3 class="font-sora font-semibold">{{ demande.titre }}</h3>
        <p class="text-sm text-gray-600 mt-1">{{ demande.description }}</p>
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div class="text-sm text-gray-500">Budget max</div>
          <div class="font-sora font-bold text-primary-container">{{ formatPrice(demande.budgetMax || 0) }}</div>
        </div>
      </div>

      <!-- Quote form -->
      <div v-if="demande" class="card p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium mb-1.5">Prix du produit (€)</label>
          <div class="relative">
            <input
              v-model="prixProduit"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-8 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Frais de livraison (€)</label>
          <div class="relative">
            <input
              v-model="fraisLivraison"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-8 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Délai (jours)</label>
          <input
            v-model="delaiJours"
            type="number"
            min="1"
            placeholder="7"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Matériau proposé</label>
          <select
            v-model="materiauPropose"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
          >
            <option value="">Sélectionner un matériau</option>
            <option v-for="mat in materiaux" :key="mat" :value="mat">{{ mat }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Couleur proposée</label>
          <input
            v-model="couleurProposee"
            type="text"
            placeholder="Ex: Noir mat"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Message (optionnel)</label>
          <textarea
            v-model="message"
            rows="4"
            placeholder="Décrivez votre approche, posez des questions..."
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none resize-none"
          />
        </div>

        <!-- Total summary -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600">Total pour l'acheteur</span>
            <span class="font-sora font-bold text-lg text-primary-container">
              {{ formatPrice(calculateTotal()) }}
            </span>
          </div>
          <div class="text-xs text-gray-400">
            Prix + Livraison
          </div>
        </div>

        <button
          @click="handleSubmit"
          :disabled="!isFormValid || submitting"
          class="w-full py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Envoi en cours...' : 'Soumettre la proposition' }}
        </button>
      </div>

      <div v-if="loading" class="max-w-2xl mx-auto px-4 py-8">
        <div class="h-8 bg-gray-200 rounded skeleton w-1/3 mb-4" />
        <div class="h-32 bg-gray-200 rounded skeleton" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { accessToken } = useAuth();
const demandeService = useDemandeService();
const devisService = useDevisService();

const demande = ref<AnnonceDemande | null>(null);
const loading = ref(true);
const submitting = ref(false);

// Form fields
const prixProduit = ref<number | null>(null);
const fraisLivraison = ref<number | null>(null);
const delaiJours = ref<number | null>(null);
const materiauPropose = ref<string>('');
const couleurProposee = ref<string>('');
const message = ref<string>('');

const materiaux = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'RESINE', 'AUTRE'];

const isFormValid = computed(() => {
  return prixProduit.value != null && prixProduit.value > 0
    && fraisLivraison.value != null && fraisLivraison.value >= 0
    && delaiJours.value != null && delaiJours.value >= 1
    && materiauPropose.value;
});

onMounted(async () => {
  try {
    const d = await demandeService.findById(route.params.id as string);
    demande.value = d;
    // Pre-fill with budget if available
    if (d.budgetMax) {
      prixProduit.value = Math.round(d.budgetMax * 0.8); // Suggest 80% of budget
    }
  } finally {
    loading.value = false;
  }
});

function calculateTotal(): number {
  const prix = prixProduit.value || 0;
  const livraison = fraisLivraison.value || 0;
  return (prix + livraison) * 100; // Convert to cents
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

async function handleSubmit() {
  if (!accessToken.value || !demande.value || !isFormValid.value) return;

  submitting.value = true;
  try {
    await devisService.submitQuote(accessToken.value, demande.value.id, {
      prixProduit: prixProduit.value! * 100, // Convert to cents
      fraisLivraison: fraisLivraison.value! * 100, // Convert to cents
      delaiJours: delaiJours.value!,
      materiauPropose: materiauPropose.value as any,
      couleurProposee: couleurProposee.value || '',
      message: message.value || undefined,
    });
    showToast('Proposition soumise avec succès !', 'success');
    await navigateTo(`/demandes/${demande.value.id}`);
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur lors de l\'envoi', 'error');
  } finally {
    submitting.value = false;
  }
}
</script>
