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
  <UCard
    :ui="{
      root: 'w-full max-w-md mx-auto rounded-2xl shadow-xl ring ring-default border-l-4 border-emerald-500 overflow-hidden'
    }"
  >
    <template #header>
      <p class="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Récupération
      </p>
      <h2 class="text-2xl font-bold tracking-tight mt-1">Mot de passe oublié</h2>
      <p class="text-sm text-muted mt-1.5">
        Un code de réinitialisation vous sera envoyé par email.
      </p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" size="lg" icon="i-lucide-mail" class="w-full" placeholder="vous@exemple.com" />
      </UFormField>

      <UButton type="submit" :loading="loading" size="lg" block class="font-medium">
        Envoyer le code
      </UButton>

      <p class="text-center text-sm text-muted">
        <ULink to="/login" class="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Retour à la connexion
        </ULink>
      </p>
    </UForm>
  </UCard>
</template>