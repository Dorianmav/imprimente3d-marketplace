<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  email: z.email("Invalid email")
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  email: ""
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UCard class="w-full max-w-md mx-auto">
    <template #header>
      <h2 class="text-xl font-semibold">Mot de passe oublié</h2>
      <p class="text-sm text-muted mt-1">
        Un code de réinitialisation vous sera envoyé par email.
      </p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" icon="i-lucide-mail" class="w-full" placeholder="vous@exemple.com" />
      </UFormField>

      <UButton type="submit" :loading="loading" block>
        Envoyer le code
      </UButton>
    </UForm>
  </UCard>
</template>