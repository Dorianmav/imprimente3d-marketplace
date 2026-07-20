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
  email:  "",
  password: "",
  typeCompte: "particulier",
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Firstname" name="prenom">
      <UInput v-model="state.prenom" />
    </UFormField>

    <UFormField label="Lastname" name="nom">
      <UInput v-model="state.nom" />
    </UFormField>

    <UFormField label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormField>

    <UFormField label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormField>

    <UFormField label="Type de compte" name="typeCompte">
      <USelect v-model="state.typeCompte" :items="[
        { label: 'Particulier', value: 'particulier' },
        { label: 'Pro', value: 'pro' }
      ]" />
    </UFormField>

    <UButton type="submit" :loading="loading"> Créer mon compte </UButton>
  </UForm>
</template>
