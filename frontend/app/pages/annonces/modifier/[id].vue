<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { getVente, getDemande } = useAnnonces();

const type = (route.query.type as "vente" | "demande") ?? "vente";
const id = route.params.id as string;

const initialData = ref<Record<string, any> | null>(null);

onMounted(async () => {
  try {
    initialData.value =
      type === "vente" ? await getVente(id) : await getDemande(id);
  } catch {
    await router.push("/annonces");
  }
});

function close() {
  router.push("/annonces");
}
</script>

<template>
  <AnnoncesAnnonceWizard
    v-if="initialData"
    :type="type"
    :annonce-id="id"
    :initial-data="initialData"
    @close="close"
    @saved="close"
  />
</template>