<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const config = useRuntimeConfig();

const schema = z.object({
  email: z.string().email("Email invalide"),
});
type Schema = z.output<typeof schema>;

const state = reactive({ email: "" });
const loading = ref(false);
const error = ref("");
const sent = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = "";
  loading.value = true;
  try {
    await $fetch(`${config.public.apiBase}/auth/forgot-password`, {
      method: "POST",
      body: event.data,
    });
    sent.value = true;
  } catch (e: any) {
    error.value = e?.data?.message || "Erreur, réessayez.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 py-8"
    style="
      padding-top: max(2rem, env(safe-area-inset-top));
      padding-bottom: max(2rem, env(safe-area-inset-bottom));
    "
  >
    <UCard
      :ui="{
        root: 'w-full max-w-md mx-auto rounded-2xl shadow-xl ring ring-default border-l-4 border-emerald-500 overflow-hidden',
      }"
    >
      <template #header>
        <p
          class="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
        >
          Accès sécurisé
        </p>
        <h2 class="text-2xl font-bold tracking-tight mt-1">
          Mot de passe oublié
        </h2>
      </template>

      <UForm
        v-if="!sent"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            size="lg"
            icon="i-lucide-mail"
            class="w-full"
            placeholder="vous@exemple.com"
          />
        </UFormField>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <UButton
          type="submit"
          :loading="loading"
          size="lg"
          block
          class="font-medium"
        >
          Envoyer le lien
        </UButton>
      </UForm>

      <p v-else class="text-center text-sm text-muted">
        Si ce compte existe, un email a été envoyé.
      </p>
    </UCard>
  </div>
</template>
