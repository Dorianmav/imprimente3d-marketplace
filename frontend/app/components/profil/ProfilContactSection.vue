<script setup lang="ts">
import type { Localisation, UserType } from '~/types/user';

const props = defineProps<{
  user: UserType;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:user': [diff: Pick<UserType, 'localisation'> & { id: number }];
}>();

const isEditing = ref(false);
const form = ref<Localisation>(emptyLocalisation());

function emptyLocalisation(): Localisation {
  return { numero: '', rue: '', ville: '', codePostal: '' };
}

function startEdit() {
  form.value = { ...emptyLocalisation(), ...props.user.localisation };
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

function handleSave() {
  emit('update:user', {
    id: props.user.id,
    localisation: { ...form.value },
  });
  isEditing.value = false;
}
</script>

<template>
  <section class="rounded-xl border p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Localisation</h2>

      <UButton
        v-if="!isEditing"
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-pencil"
        aria-label="Modifier la localisation"
        @click="startEdit"
      />
    </div>

    <template v-if="!isEditing">
      <p v-if="user.localisation" class="text-sm">
        {{ user.localisation.numero }} {{ user.localisation.rue }}<br>
        {{ user.localisation.codePostal }} {{ user.localisation.ville }}
      </p>
      <p v-else class="text-sm text-muted">Aucune localisation renseignée.</p>
    </template>

    <template v-else>
      <div class="mb-4 grid gap-3 sm:grid-cols-6">
        <UFormField label="N°" class="sm:col-span-1">
          <UInput v-model="form.numero" class="w-full" />
        </UFormField>

        <UFormField label="Rue" class="sm:col-span-5">
          <UInput v-model="form.rue" class="w-full" />
        </UFormField>

        <UFormField label="Code postal" class="sm:col-span-2">
          <UInput v-model="form.codePostal" inputmode="numeric" maxlength="5" class="w-full" />
        </UFormField>

        <UFormField label="Ville" class="sm:col-span-4">
          <UInput v-model="form.ville" class="w-full" />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="cancelEdit">Annuler</UButton>
        <UButton :loading="loading" @click="handleSave">Enregistrer</UButton>
      </div>
    </template>
  </section>
</template>
