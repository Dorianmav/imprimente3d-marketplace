<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  prenom: z
    .string("Le prénom est requis")
    .min(2, "2 caractères minimum")
    .max(100, "100 caractères maximum"),
  nom: z
    .string("Le nom est requis")
    .min(2, "2 caractères minimum")
    .max(100, "100 caractères maximum"),
  email: z.email("Email invalide"),
  password: z
    .string("Le mot de passe est requis")
    .min(8, "8 caractères minimum")
    .max(128, "128 caractères maximum"),
  typeCompte: z.enum(["ACHETEUR", "IMPRIMEUR"]).default("ACHETEUR"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  prenom: "",
  nom: "",
  email: "",
  password: "",
  typeCompte: "ACHETEUR",
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Prénom" name="prenom" class="space-y-1">
        <UInput
          v-model="state.prenom"
          placeholder="Amir"
          class="rounded-lg"
        />
      </UFormField>

      <UFormField label="Nom" name="nom" class="space-y-1">
        <UInput
          v-model="state.nom"
          placeholder="Talbi"
          class="rounded-lg"
        />
      </UFormField>
    </div>

    <UFormField label="Email" name="email" class="space-y-1">
      <UInput
        v-model="state.email"
        placeholder="vous@exemple.com"
        icon="mail"
        class="rounded-lg"
      />
    </UFormField>

    <UFormField label="Mot de passe" name="password" class="space-y-1">
      <UInput
        v-model="state.password"
        type="password"
        placeholder="8 caractères minimum"
        icon="lock"
        class="rounded-lg"
      />
    </UFormField>

    <UFormField label="Type de compte" name="typeCompte" class="space-y-1">
      <USelect
        v-model="state.typeCompte"
        :items="[
          { label: 'Acheteur', value: 'ACHETEUR', icon: 'shopping-cart' },
          { label: 'Imprimeur', value: 'IMPRIMEUR', icon: 'cube' },
        ]"
        value-attribute="value"
        class="rounded-lg"
      />
    </UFormField>

    <UButton
      type="submit"
      :loading="loading"
      block
      class="rounded-full font-semibold"
    >
      Créer mon compte
    </UButton>
  </UForm>
</template>
