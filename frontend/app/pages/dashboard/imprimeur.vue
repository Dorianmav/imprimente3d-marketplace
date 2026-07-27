<script setup lang="ts">
const { user } = useAuth();
const { getMine, createOrUpdate, toggleDisponible } = useImprimeur();
const toast = useToast();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const existing = ref<any>(null);

const materiauxOptions = ["PLA", "PETG", "ABS", "ASA", "TPU", "RESINE", "AUTRE"];

const form = reactive({
  bio: "",
  imprimantes: [{ marque: "", modele: "", dimensionMaxX: 0, dimensionMaxY: 0, dimensionMaxZ: 0 }],
  materiaux: [] as string[],
  zoneExpedition: "",
  delaiMoyenJours: 3,
  tarifsIndicatifs: "",
});

onMounted(async () => {
  if (!(user.value as any)?.stripeOnboardingComplete) {
    toast.add({
      title: "Compte Stripe requis",
      description: "Finalisez votre compte Stripe avant de créer votre profil imprimeur.",
      color: "warning",
    });
    await router.push("/dashboard");
    return;
  }

  try {
    const data = await getMine();
    if (data) {
      existing.value = data;
      form.bio = data.bio ?? "";
      form.imprimantes = data.imprimantes;
      form.materiaux = data.materiaux;
      form.zoneExpedition = data.zoneExpedition ?? "";
      form.delaiMoyenJours = data.delaiMoyenJours;
      form.tarifsIndicatifs = data.tarifsIndicatifs ?? "";
    }
  } finally {
    loading.value = false;
  }
});

function addImprimante() {
  form.imprimantes.push({ marque: "", modele: "", dimensionMaxX: 0, dimensionMaxY: 0, dimensionMaxZ: 0 });
}

function removeImprimante(i: number) {
  if (form.imprimantes.length > 1) form.imprimantes.splice(i, 1);
}

async function submit() {
  saving.value = true;
  try {
    await createOrUpdate({
      bio: form.bio || undefined,
      imprimantes: form.imprimantes,
      materiaux: form.materiaux as any,
      zoneExpedition: form.zoneExpedition || undefined,
      delaiMoyenJours: Number(form.delaiMoyenJours),
      tarifsIndicatifs: form.tarifsIndicatifs || undefined,
    });
    toast.add({ title: "Profil imprimeur enregistré", color: "success" });
    await router.push("/dashboard");
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e?.data?.message || "Une erreur est survenue.",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function onToggleDisponible(val: boolean) {
  try {
    await toggleDisponible(val);
    toast.add({ title: val ? "Profil activé" : "Profil mis en pause", color: "success" });
  } catch {
    toast.add({ title: "Erreur", color: "error" });
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center py-10">
    <div class="w-full max-w-xl rounded-2xl border border-gray-400 bg-white p-8 shadow-sm">
      <h1 class="text-2xl font-bold mb-6">Profil imprimeur</h1>

      <div v-if="loading" class="text-gray-500">Chargement...</div>

      <div v-else class="space-y-6">
        <div v-if="existing" class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
          <span class="text-sm">Disponible pour de nouvelles demandes</span>
          <USwitch :model-value="existing.disponible" @update:model-value="onToggleDisponible" />
        </div>

        <UFormField label="Bio (optionnel)">
          <UTextarea v-model="form.bio" :rows="3" class="w-full" />
        </UFormField>

        <div>
          <p class="font-semibold mb-2">Imprimantes</p>
          <div
            v-for="(imp, i) in form.imprimantes"
            :key="i"
            class="space-y-2 mb-3 rounded-lg border border-gray-200 p-3"
          >
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Marque">
                <UInput v-model="imp.marque" class="w-full" />
              </UFormField>
              <UFormField label="Modèle">
                <UInput v-model="imp.modele" class="w-full" />
              </UFormField>
            </div>

            <p class="text-xs text-gray-500">
              Volume d'impression maximal supporté par l'imprimante (en millimètres).
            </p>
            <div class="grid grid-cols-3 gap-2">
              <UFormField label="Largeur max X (mm)">
                <UInput v-model="imp.dimensionMaxX" type="number" class="w-full" />
              </UFormField>
              <UFormField label="Profondeur max Y (mm)">
                <UInput v-model="imp.dimensionMaxY" type="number" class="w-full" />
              </UFormField>
              <UFormField label="Hauteur max Z (mm)">
                <UInput v-model="imp.dimensionMaxZ" type="number" class="w-full" />
              </UFormField>
            </div>

            <UButton
              v-if="form.imprimantes.length > 1"
              variant="ghost"
              color="error"
              icon="i-tabler-trash"
              size="sm"
              @click="removeImprimante(i)"
            >
              Retirer cette imprimante
            </UButton>
          </div>
          <UButton variant="outline" size="sm" icon="i-tabler-plus" @click="addImprimante">
            Ajouter une imprimante
          </UButton>
        </div>

        <UFormField label="Matériaux disponibles">
          <USelectMenu
            v-model="form.materiaux"
            :items="materiauxOptions"
            multiple
            class="w-full"
          />
        </UFormField>

        <UFormField label="Zone d'expédition">
          <UInput v-model="form.zoneExpedition" placeholder="ex. France entière, 50km autour de..." class="w-full" />
        </UFormField>

        <UFormField label="Délai moyen (jours)">
          <UInput v-model="form.delaiMoyenJours" type="number" class="w-full" />
        </UFormField>

        <UFormField label="Tarifs indicatifs (optionnel)">
          <UTextarea v-model="form.tarifsIndicatifs" :rows="2" placeholder="ex. à partir de 0,15€/g" class="w-full" />
        </UFormField>

        <UButton block color="primary" :loading="saving" @click="submit">
          {{ existing ? "Enregistrer" : "Créer mon profil imprimeur" }}
        </UButton>
      </div>
    </div>
  </div>
</template>