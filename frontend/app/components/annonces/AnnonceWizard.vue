<script setup lang="ts">
const props = defineProps<{
  type: "vente" | "demande";
  annonceId?: string;
  initialData?: Record<string, any>;
}>();

const emit = defineEmits<{ close: []; saved: [] }>();

const { createVente, updateVente, createDemande, updateDemande } = useAnnonces();
const { uploadFile } = useUpload();
const toast = useToast();

const step = ref(0);
const loading = ref(false);
const isEdit = computed(() => !!props.annonceId);

const stepsVente = ["Infos", "Photos", "Prix & livraison", "Récapitulatif"];
const stepsDemande = ["Infos", "Fichier / photos", "Détails", "Récapitulatif"];
const steps = computed(() => (props.type === "vente" ? stepsVente : stepsDemande));

const form = reactive({
  titre: props.initialData?.titre ?? "",
  description: props.initialData?.description ?? "",
  categorie: props.initialData?.categorie ?? "",
  materiau: props.initialData?.materiau ?? "",
  couleur: props.initialData?.couleur ?? "",
  photos: props.initialData?.photos ?? ([] as string[]),
  prixProduit: props.initialData?.prixProduit ?? null,
  modeLivraison: props.initialData?.modeLivraison ?? "ENVOI",
  fraisLivraison: props.initialData?.fraisLivraison ?? 0,
  stock: props.initialData?.stock ?? null,
  fichier3d: props.initialData?.fichier3d ?? "",
  photosReference: props.initialData?.photosReference ?? ([] as string[]),
  budgetMax: props.initialData?.budgetMax ?? null,
  materiauSouhaite: props.initialData?.materiauSouhaite ?? "",
  couleurSouhaitee: props.initialData?.couleurSouhaitee ?? "",
  quantite: props.initialData?.quantite ?? 1,
});

const categories = ["DECORATION", "JOUET", "MAQUETTE", "PIECE_TECHNIQUE", "COSPLAY", "MINIATURE", "AUTRE"];
const materiaux = ["PLA", "PETG", "ABS", "ASA", "TPU", "RESINE", "AUTRE"];

function canContinue() {
  if (step.value === 0) return !!form.titre;
  if (step.value === 1) {
    return props.type === "vente"
      ? form.photos.length > 0
      : !!form.fichier3d || !!form.description;
  }
  if (step.value === 2) {
    return props.type === "vente" ? !!form.prixProduit : true;
  }
  return true;
}

function next() {
  if (canContinue() && step.value < steps.value.length - 1) step.value++;
}
function back() {
  if (step.value > 0) step.value--;
}

async function onFilesSelected(e: Event, target: "photos" | "photosReference") {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const file of Array.from(files)) {
    const url = await uploadFile(file);
    form[target].push(url);
  }
}

async function on3dFileSelected(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.[0]) return;
  form.fichier3d = await uploadFile(files[0]);
}

function removePhoto(target: "photos" | "photosReference", index: number) {
  form[target].splice(index, 1);
}

async function submit() {
  loading.value = true;
  try {
    if (props.type === "vente") {
      const payload = {
        titre: form.titre,
        description: form.description,
        categorie: form.categorie,
        materiau: form.materiau,
        couleur: form.couleur,
        photos: form.photos,
        prixProduit: Number(form.prixProduit),
        modeLivraison: form.modeLivraison,
        fraisLivraison:
          form.modeLivraison === "MAIN_PROPRE" ? 0 : Number(form.fraisLivraison),
        stock: form.stock ? Number(form.stock) : undefined,
      };
      if (isEdit.value) await updateVente(props.annonceId!, payload);
      else await createVente(payload);
    } else {
      const payload = {
        titre: form.titre,
        description: form.description || undefined,
        fichier3d: form.fichier3d || undefined,
        photosReference: form.photosReference,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        materiauSouhaite: form.materiauSouhaite || undefined,
        couleurSouhaitee: form.couleurSouhaitee || undefined,
        quantite: Number(form.quantite),
      };
      if (isEdit.value) await updateDemande(props.annonceId!, payload);
      else await createDemande(payload);
    }

    toast.add({ title: isEdit.value ? "Annonce modifiée" : "Annonce publiée", color: "success" });
    emit("saved");
    emit("close");
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e?.data?.message || "Une erreur est survenue.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-white overflow-y-auto">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <div class="flex items-center gap-3">
        <span
          v-for="(s, i) in steps"
          :key="s"
          class="h-2 w-8 rounded-full"
          :class="i <= step ? 'bg-primary' : 'bg-gray-200'"
        />
      </div>
      <UButton icon="i-tabler-x" variant="ghost" color="neutral" @click="emit('close')" />
    </div>

    <div class="mx-auto max-w-xl px-6 py-10">
      <h2 class="text-xl font-bold mb-6">{{ steps[step] }}</h2>

      <!-- Step 0: Infos -->
      <div v-if="step === 0" class="space-y-4">
        <UFormField label="Titre">
          <UInput v-model="form.titre" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Description">
          <UTextarea v-model="form.description" :rows="5" class="w-full" />
        </UFormField>
        <template v-if="type === 'vente'">
          <UFormField label="Catégorie">
            <USelect v-model="form.categorie" :items="categories" class="w-full" />
          </UFormField>
          <UFormField label="Matériau">
            <USelect v-model="form.materiau" :items="materiaux" class="w-full" />
          </UFormField>
          <UFormField label="Couleur">
            <UInput v-model="form.couleur" class="w-full" />
          </UFormField>
        </template>
      </div>

      <!-- Step 1: Photos / Fichier -->
      <div v-else-if="step === 1" class="space-y-4">
        <template v-if="type === 'vente'">
          <UFormField label="Photos">
            <input type="file" multiple accept="image/*" @change="onFilesSelected($event, 'photos')" />
          </UFormField>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="(p, i) in form.photos" :key="p" class="relative">
              <img :src="p" class="rounded-lg aspect-square object-cover" />
              <UButton
                icon="i-tabler-x"
                size="xs"
                color="error"
                class="absolute top-1 right-1"
                @click="removePhoto('photos', i)"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <UFormField label="Fichier 3D (STL/3MF)">
            <input type="file" accept=".stl,.3mf" @change="on3dFileSelected" />
          </UFormField>
          <p class="text-sm text-gray-500">ou décrivez précisément l'objet souhaité ci-dessus.</p>
          <UFormField label="Photos de référence">
            <input type="file" multiple accept="image/*" @change="onFilesSelected($event, 'photosReference')" />
          </UFormField>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="(p, i) in form.photosReference" :key="p" class="relative">
              <img :src="p" class="rounded-lg aspect-square object-cover" />
              <UButton
                icon="i-tabler-x"
                size="xs"
                color="error"
                class="absolute top-1 right-1"
                @click="removePhoto('photosReference', i)"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Step 2: Prix & livraison (vente) / Détails (demande) -->
      <div v-else-if="step === 2" class="space-y-4">
        <template v-if="type === 'vente'">
          <UFormField label="Prix (€)">
            <UInput v-model="form.prixProduit" type="number" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Mode de livraison">
            <USelect
              v-model="form.modeLivraison"
              :items="[
                { label: 'Envoi', value: 'ENVOI' },
                { label: 'Remise en main propre', value: 'MAIN_PROPRE' },
                { label: 'Les deux', value: 'LES_DEUX' },
              ]"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField v-if="form.modeLivraison !== 'MAIN_PROPRE'" label="Frais de livraison (€)">
            <UInput v-model="form.fraisLivraison" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Stock (optionnel)">
            <UInput v-model="form.stock" type="number" class="w-full" />
          </UFormField>
        </template>
        <template v-else>
          <UFormField label="Budget max (€, optionnel)">
            <UInput v-model="form.budgetMax" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Matériau souhaité">
            <USelect v-model="form.materiauSouhaite" :items="materiaux" class="w-full" />
          </UFormField>
          <UFormField label="Couleur souhaitée">
            <UInput v-model="form.couleurSouhaitee" class="w-full" />
          </UFormField>
          <UFormField label="Quantité">
            <UInput v-model="form.quantite" type="number" class="w-full" />
          </UFormField>
        </template>
      </div>

      <!-- Step 3: Récap -->
      <div v-else class="space-y-2 text-sm">
        <p><span class="font-semibold">Titre :</span> {{ form.titre }}</p>
        <p><span class="font-semibold">Description :</span> {{ form.description }}</p>
        <p v-if="type === 'vente'">
          <span class="font-semibold">Prix :</span> {{ form.prixProduit }} €
          — Livraison : {{ form.modeLivraison }}
        </p>
        <p v-else>
          <span class="font-semibold">Quantité :</span> {{ form.quantite }}
          <span v-if="form.budgetMax"> — Budget max : {{ form.budgetMax }} €</span>
        </p>
      </div>

      <div class="flex justify-between mt-10">
        <UButton v-if="step > 0" variant="ghost" @click="back">Retour</UButton>
        <span v-else />
        <UButton
          v-if="step < steps.length - 1"
          color="primary"
          :disabled="!canContinue()"
          @click="next"
        >
          Continuer
        </UButton>
        <UButton v-else color="primary" :loading="loading" @click="submit">
          {{ isEdit ? "Enregistrer" : "Publier" }}
        </UButton>
      </div>
    </div>
  </div>
</template>