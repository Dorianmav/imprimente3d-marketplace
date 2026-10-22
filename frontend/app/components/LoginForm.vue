<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  email: z.email("Email invalide"),
  password: z
    .string("Le mot de passe est requis")
    .min(8, "8 caractères minimum")
    .max(128, "128 caractères maximum")
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
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
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
        placeholder="••••••••"
        icon="lock"
        class="rounded-lg"
      />
    </UFormField>

    <div class="flex items-center justify-between text-sm">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" class="rounded border-gray-300" />
        <span class="text-gray-600">Se souvenir de moi</span>
      </label>
      <a href="#" class="text-primary-container hover:underline">Mot de passe oublié ?</a>
    </div>

    <UButton
      type="submit"
      :loading="loading"
      block
      class="rounded-full font-semibold"
    >
      Se connecter
    </UButton>
  </UForm>
</template>
