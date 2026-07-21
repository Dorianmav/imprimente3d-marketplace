<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  code: z
    .string("Code requis")
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code doit contenir uniquement des chiffres")
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  code: ""
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UCard class="w-full max-w-md mx-auto">
    <template #header>
      <h2 class="text-xl font-semibold">Vérifier le compte</h2>
      <p class="text-sm text-muted mt-1">
        Entrez le code à 6 chiffres reçu par email.
      </p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Code de vérification" name="code">
        <UPinInput v-model="state.code" :length="6" type="number" class="w-full justify-center" />
      </UFormField>

      <UButton type="submit" :loading="loading" block>
        Vérifier
      </UButton>
    </UForm>
  </UCard>
</template>