<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-container mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour à l'accueil
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Nouvelle demande de impression</h1>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Titre -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Titre <span class="text-red-500">*</span></label>
          <input
            v-model="form.titre"
            type="text"
            required
            placeholder="Ex: Figurine dragon, support casque, décor mural..."
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
          />
        </div>

        <!-- Catégorie -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Catégorie <span class="text-red-500">*</span></label>
          <select
            v-model="form.categorie"
            required
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all bg-white"
          >
            <option value="" disabled>Choisir une catégorie</option>
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </div>

        <!-- Matériau -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Matériau souhaité <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="materiau in materiaux"
              :key="materiau.value"
              type="button"
              @click="form.materiau = materiau.value"
              class="py-2 rounded-lg text-sm font-medium border-2 transition-colors"
              :class="form.materiau === materiau.value ? 'border-primary-container bg-primary-container/5 text-primary-container' : 'border-gray-200 hover:border-gray-300'"
            >
              {{ materiau.label }}
            </button>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Description détaillée</label>
          <textarea
            v-model="form.description"
            rows="4"
            placeholder="Décrivez en détail ce que vous souhaitez, les dimensions, les couleurs, le niveau de détail..."
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all resize-none"
          />
        </div>

        <!-- Fichier de référence -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Fichier de référence (optionnel)</label>
          <div class="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
            <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-sm text-gray-500">Glissez un fichier ou <span class="text-primary-container font-medium">parcourez</span></p>
            <p class="text-xs text-gray-400 mt-1">STL, OBJ, PNG (max 10 MB)</p>
          </div>
        </div>

        <!-- Budget -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Budget maximum (€) <span class="text-red-500">*</span></label>
          <div class="relative">
            <input
              v-model="form.budgetMax"
              type="number"
              min="1"
              step="0.01"
              required
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-12 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            class="flex-1 py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors shadow-md shadow-primary-container/20"
          >
            Publier la demande
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Materiau } from '~/types';

const demandeService = useDemandeService();
const { accessToken } = useAuth();

useHead({ title: 'Nouvelle demande — Layerly' });

const categories = [
  { label: 'Figurines', value: 'FIGURINE' },
  { label: 'Objets home & déco', value: 'HOME_DECOR' },
  { label: 'Gadgets', value: 'GADGET' },
  { label: 'Jeux de rôle', value: 'JEU_ROLE' },
  { label: 'Véhicules', value: 'VEHICULE' },
  { label: 'Autre', value: 'AUTRE' },
];

const materiaux = [
  { label: 'PLA', value: Materiau.PLA },
  { label: 'PETG', value: Materiau.PETG },
  { label: 'ABS', value: Materiau.ABS },
  { label: 'ASA', value: Materiau.ASA },
  { label: 'TPU', value: Materiau.TPU },
  { label: 'Résine', value: Materiau.RESINE },
];

const form = reactive({
  titre: '',
  categorie: '',
  materiau: '',
  description: '',
  budgetMax: '',
});

async function handleSubmit() {
  if (!accessToken.value) {
    navigateTo('/login');
    return;
  }
  try {
    const demande = await demandeService.create(accessToken.value, {
      titre: form.titre,
      categorie: form.categorie as CategorieAnnonce,
      materiau: form.materiau as Materiau,
      description: form.description,
      budgetMax: Math.round(parseFloat(form.budgetMax as string) * 100),
    });
    navigateTo(`/demandes/${demande.id}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
    showToast(msg, 'error');
  }
}
</script>
