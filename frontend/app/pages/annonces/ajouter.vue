<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user } = useAuth();

definePageMeta({
  layout: "blank",
  title: "Ajouter une annonce",
});

const type = ref<"vente" | "demande" | null>(
  (route.query.type as "vente" | "demande") ?? null,
);

const canVendre = computed(() => !!(user.value as any)?.imprimeurProfil);

function close() {
  router.push("/dashboard");
}
</script>

<template>
  <div>
    <div v-if="!type" class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6">
      <UButton
        icon="i-tabler-x"
        variant="ghost"
        color="neutral"
        class="absolute top-4 right-4"
        @click="close"
      />
      <h1 class="text-2xl font-bold">Quel type d'annonce ?</h1>
      <div class="flex gap-4">
        <UButton v-if="canVendre" size="lg" @click="type = 'vente'">
          Vendre un objet
        </UButton>
        <UButton size="lg" variant="outline" @click="type = 'demande'">
          Faire une demande
        </UButton>
      </div>
    </div>

    <AnnoncesAnnonceWizard v-else :type="type" @close="close" @saved="close" />
  </div>
</template>