<template>
  <div class="min-h-screen pb-20 md:pb-0">
    <div class="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-container mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour à l'accueil
      </NuxtLink>

      <h1 class="font-sora font-bold text-2xl md:text-3xl mb-6">Publier une vente</h1>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Titre -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Titre <span class="text-red-500">*</span></label>
          <input
            v-model="form.titre"
            type="text"
            required
            placeholder="Ex: Figurine dragon royal, Support casque gaming..."
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
          <label class="block text-sm font-medium mb-1.5">Matériau <span class="text-red-500">*</span></label>
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
          <label class="block text-sm font-medium mb-1.5">Description détaillée <span class="text-red-500">*</span></label>
          <textarea
            v-model="form.description"
            rows="4"
            required
            placeholder="Décrivez votre modèle, ses dimensions, son utilisation..."
            class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all resize-none"
          />
        </div>

        <!-- Prix -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Prix (€) <span class="text-red-500">*</span></label>
          <div class="relative">
            <input
              v-model="form.prix"
              type="number"
              min="0.01"
              step="0.01"
              required
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-12 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          </div>
        </div>

        <!-- Fichiers 3D -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Fichiers 3D (STL/OBJ) <span class="text-red-500">*</span></label>
          <div
            class="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer"
            @drop.prevent="handleDrop"
            @dragover.prevent
            @click="$refs.fileInput?.click()"
          >
            <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-sm text-gray-500">Glissez des fichiers ou <span class="text-primary-container font-medium">parcourez</span></p>
            <p class="text-xs text-gray-400 mt-1">STL, OBJ (max 25 MB)</p>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".stl,.obj,.3mf"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>
          <!-- Selected files -->
          <div v-if="files.length" class="mt-2 space-y-1">
            <div
              v-for="(file, idx) in files"
              :key="idx"
              class="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm"
            >
              <span class="text-gray-700 truncate">{{ file.name }}</span>
              <button @click="files.splice(idx, 1)" class="text-red-400 hover:text-red-500">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            class="flex-1 py-3 rounded-full font-sora font-semibold text-white bg-primary-container hover:bg-primary transition-colors shadow-md shadow-primary-container/20"
          >
            Publier la vente
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Materiau } from '~/types';

const venteService = useVenteService();
const { accessToken } = useAuth();

useHead({ title: 'Publier une vente — Layerly' });

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
  prix: '',
});

const files = ref<File[]>([]);

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    files.value = Array.from(target.files);
  }
}

function handleDrop(event: DragEvent) {
  if (event.dataTransfer?.files) {
    files.value = Array.from(event.dataTransfer.files);
  }
}

async function handleSubmit() {
  if (!accessToken.value) {
    navigateTo('/login');
    return;
  }
  if (!form.prix || parseFloat(form.prix) <= 0) {
    showToast('Veuillez entrer un prix valide', 'error');
    return;
  }
  if (files.value.length === 0) {
    showToast('Veuillez ajouter au moins un fichier 3D', 'error');
    return;
  }
  try {
    // Create the vente
    const vente = await venteService.create(accessToken.value, {
      titre: form.titre,
      categorie: form.categorie as CategorieAnnonce,
      materiau: form.materiau as Materiau,
      description: form.description,
      prix: Math.round(parseFloat(form.prix) * 100),
      fichiers3d: [], // TODO: upload files separately
    });
    showToast('Vente publiée avec succès !', 'success');
    navigateTo(`/ventes/${vente.id}`);
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur lors de la publication', 'error');
  }
}
</script>
