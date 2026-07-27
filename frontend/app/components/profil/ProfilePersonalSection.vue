<script lang="ts" setup>
import { useEditableSection } from '~/composables/useEditableSection';
import type { UserType, Localisation } from '~/types/user';


const props = defineProps<{
  user: UserType;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:user": [diff: Partial<UserType> & { id: number }];
}>();

// on transforme la prop en Ref pour le composable
const userRef = toRef(props, "user");
const { isEditing, form, startEdit, cancelEdit, getDiff } = useEditableSection(userRef);

function handleSave() {
  const diff = getDiff();

  // rien n'a changé -> pas d'appel API inutile
  if (Object.keys(diff).length === 0) {
    isEditing.value = false;
    return;
  }

  emit("update:user", { id: props.user.id, ...diff });
  isEditing.value = false;
}

</script>

<template>
  <div class="rounded-xl border p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="font-semibold text-lg">Informations personnelles</h2>

      <UButton
        v-if="!isEditing"
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-pencil"
        @click="startEdit"
      />
    </div>

    <template v-if="!isEditing">
      <div class="flex items-center">
        <p><span class="font-semibold">ID :</span> {{ user.id }}</p>
      </div>
      <div class="flex items-center">
        <p><span class="font-semibold">Nom :</span> {{ user.prenom }} {{ user.nom }}</p>
      </div>
    </template>

    <template v-else>
      <div class="mb-4 space-y-3">
        <UFormField label="Nom">
          <UInput v-model="form.nom" class="w-full" />
        </UFormField>

        <UFormField label="Prénom">
          <UInput v-model="form.prenom" class="w-full" />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="cancelEdit">
          Annuler
        </UButton>
        <UButton :loading="loading" @click="handleSave">
          Enregistrer
        </UButton>
      </div>
    </template>
  </div>
</template>