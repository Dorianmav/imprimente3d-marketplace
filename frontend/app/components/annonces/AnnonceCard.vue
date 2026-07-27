<script setup lang="ts">
const props = defineProps<{
  annonce: Record<string, any>;
  type: "vente" | "demande";
}>();

const emit = defineEmits<{ deleted: [] }>();

const { deleteVente, deleteDemande } = useAnnonces();
const toast = useToast();
const router = useRouter();
const config = useRuntimeConfig();

const isDeleteModalOpen = ref(false);
const deleteLoading = ref(false);

function edit() {
  router.push(`/annonces/modifier/${props.annonce.id}?type=${props.type}`);
}

async function confirmDelete() {
  deleteLoading.value = true;
  try {
    if (props.type === "vente") await deleteVente(props.annonce.id);
    else await deleteDemande(props.annonce.id);
    toast.add({ title: "Annonce supprimée", color: "success" });
    emit("deleted");
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e?.data?.message || "Suppression impossible.",
      color: "error",
    });
  } finally {
    deleteLoading.value = false;
    isDeleteModalOpen.value = false;
  }
}

async function share() {
  const url = `${config.public.frontendUrl ?? window.location.origin}/annonces/${props.type}/${props.annonce.id}`;
  if (navigator.share) {
    await navigator.share({ title: props.annonce.titre, url });
  } else {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "Lien copié", color: "success" });
  }
}
</script>

<template>
  <div class="rounded-2xl border border-gray-400 bg-white p-4 shadow-sm">
    <div class="flex items-start justify-between">
      <div>
        <h3 class="font-semibold">{{ annonce.titre }}</h3>
        <p class="text-sm text-gray-500 line-clamp-2">
          {{ annonce.description }}
        </p>
        <p v-if="type === 'vente'" class="mt-1 font-bold">
          {{ annonce.prixProduit }} €
        </p>
      </div>
      <UDropdownMenu
        :items="[
          [
            { label: 'Modifier', icon: 'i-tabler-edit', onSelect: edit },
            { label: 'Partager', icon: 'i-tabler-share', onSelect: share },
            {
              label: 'Supprimer',
              icon: 'i-tabler-trash',
              color: 'error',
              onSelect: () => (isDeleteModalOpen = true),
            },
          ],
        ]"
      >
        <UButton
          icon="i-tabler-dots-vertical"
          variant="ghost"
          color="neutral"
        />
      </UDropdownMenu>
    </div>

    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold text-lg">Supprimer l'annonce</h3>
          </template>
          <p class="text-sm text-muted">Cette action est irréversible.</p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="isDeleteModalOpen = false"
                >Annuler</UButton
              >
              <UButton
                color="red"
                :loading="deleteLoading"
                @click="confirmDelete"
              >
                Supprimer
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
