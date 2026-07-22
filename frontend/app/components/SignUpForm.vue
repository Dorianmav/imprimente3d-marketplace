<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  prenom: z
    .string("Firstname is required")
    .min(2, "Must be at least 2 characters")
    .max(100, "Must be at most 100 characters"),
  nom: z
    .string("Lastname is required")
    .min(2, "Must be at least 2 characters")
    .max(100, "Must be at most 100 characters"),
  email: z.email("Invalid email"),
  password: z
    .string("Password is required")
    .min(8, "Must be at least 8 characters")
    .max(128, "Must be at most 128 characters"),
  typeCompte: z.enum(["particulier", "pro"]).default("particulier"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  prenom: "",
  nom: "",
  email: "",
  password: "",
  typeCompte: "particulier",
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
        Inscription
      </p>
      <h2 class="text-2xl font-bold tracking-tight mt-1">Créer votre compte</h2>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Prénom" name="prenom">
          <UInput v-model="state.prenom" size="lg" class="w-full" />
        </UFormField>

        <UFormField label="Nom" name="nom">
          <UInput v-model="state.nom" size="lg" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" size="lg" icon="i-lucide-mail" class="w-full" />
      </UFormField>

      <UFormField label="Mot de passe" name="password">
        <UInput v-model="state.password" size="lg" type="password" icon="i-lucide-lock" class="w-full" />
      </UFormField>

      <UFormField label="Type de compte" name="typeCompte">
        <UButtonGroup class="w-full">
          <UButton
            class="flex-1 justify-center"
            :color="state.typeCompte === 'particulier' ? 'primary' : 'neutral'"
            :variant="state.typeCompte === 'particulier' ? 'solid' : 'outline'"
            @click="state.typeCompte = 'particulier'"
          >
            Particulier
          </UButton>
          <UButton
            class="flex-1 justify-center"
            :color="state.typeCompte === 'pro' ? 'primary' : 'neutral'"
            :variant="state.typeCompte === 'pro' ? 'solid' : 'outline'"
            @click="state.typeCompte = 'pro'"
          >
            Pro
          </UButton>
        </UButtonGroup>
      </UFormField>

      <UButton type="submit" :loading="loading" size="lg" block class="font-medium">
        Créer mon compte
      </UButton>

      <p class="text-center text-sm text-muted">
        Déjà un compte ?
        <ULink to="/login" class="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Se connecter
        </ULink>
      </p>
    </UForm>
  </UCard>
</template>