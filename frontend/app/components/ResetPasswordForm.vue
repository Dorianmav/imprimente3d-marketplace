<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const schema = z
  .object({
    password: z
      .string("Password is required")
      .min(8, "Must be at least 8 characters")
      .max(128, "Must be at most 128 characters"),
    passwordConfirm: z.string("Confirmation requise"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirm"],
  });

type Schema = z.output<typeof schema>;

defineProps<{ loading?: boolean; error?: string; success?: boolean }>();

const state = reactive<Partial<Schema>>({
  password: "",
  passwordConfirm: "",
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UCard
    :ui="{
      root: 'w-full max-w-md mx-auto rounded-2xl shadow-xl ring ring-default border-l-4 border-emerald-500 overflow-hidden',
    }"
  >
    <template #header>
      <p class="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Nouveau départ
      </p>
      <h2 class="text-2xl font-bold tracking-tight mt-1">Réinitialiser le mot de passe</h2>
    </template>

    <UForm v-if="!success" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Nouveau mot de passe" name="password">
        <UInput v-model="state.password" size="lg" type="password" icon="i-lucide-lock" class="w-full" autocomplete="new-password" />
      </UFormField>

      <UFormField label="Confirmer le mot de passe" name="passwordConfirm">
        <UInput v-model="state.passwordConfirm" size="lg" type="password" icon="i-lucide-lock" class="w-full" autocomplete="new-password" />
      </UFormField>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <UButton type="submit" :loading="loading" size="lg" block class="font-medium">
        Réinitialiser
      </UButton>

      <p class="text-center text-sm text-muted">
        <ULink to="/login" class="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Retour à la connexion
        </ULink>
      </p>
    </UForm>

    <p v-else class="text-center text-sm text-muted">
      Mot de passe réinitialisé. Redirection...
    </p>
  </UCard>
</template>