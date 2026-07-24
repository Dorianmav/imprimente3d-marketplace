<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  email: z.email("Invalid email"),
  password: z
    .string("Password is required")
    .min(8, "Must be at least 8 characters")
    .max(128, "Must be at most 128 characters")
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  email: "",
  password: ""
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
        Accès sécurisé
      </p>
      <h2 class="text-2xl font-bold tracking-tight mt-1">Connexion</h2>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" size="lg" icon="i-lucide-mail" class="w-full" placeholder="vous@exemple.com" />
      </UFormField>

      <UFormField label="Mot de passe" name="password">
        <UInput v-model="state.password" size="lg" type="password" icon="i-lucide-lock" class="w-full" />
      </UFormField>

      <div class="flex justify-end">
        <ULink to="/auth/forgot-password" class="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Mot de passe oublié ?
        </ULink>
      </div>

      <UButton type="submit" :loading="loading" size="lg" block class="font-medium">
        Se connecter
      </UButton>

      <p class="text-center text-sm text-muted">
        Pas encore de compte ?
        <ULink to="/signup" class="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Créer un compte
        </ULink>
      </p>
    </UForm>
  </UCard>
</template>