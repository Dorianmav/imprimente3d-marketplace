<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const route = useRoute();

const schema = z.object({
  email: z.email("Invalid email"),
  code: z
    .string("Code requis")
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code doit contenir uniquement des chiffres"),
  password: z
    .string("Password is required")
    .min(8, "Must be at least 8 characters")
    .max(128, "Must be at most 128 characters"),
  passwordConfirm: z.string("Confirmation requise")
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirm"]
});

type Schema = z.output<typeof schema>;

defineProps<{ loading?: boolean }>();

const state = reactive<Partial<Schema>>({
  email: "",
  code: typeof route.params.code === "string" ? route.params.code : "",
  password: "",
  passwordConfirm: ""
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UCard class="w-full max-w-md mx-auto">
    <template #header>
      <h2 class="text-xl font-semibold">Réinitialiser le mot de passe</h2>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <input type="hidden" v-model="state.code" />

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" icon="i-lucide-mail" class="w-full" placeholder="vous@exemple.com" />
      </UFormField>

      <UFormField label="Nouveau mot de passe" name="password">
        <UInput v-model="state.password" type="password" icon="i-lucide-lock" class="w-full" />
      </UFormField>

      <UFormField label="Confirmer le mot de passe" name="passwordConfirm">
        <UInput v-model="state.passwordConfirm" type="password" icon="i-lucide-lock" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="loading" block>
        Réinitialiser
      </UButton>
    </UForm>
  </UCard>
</template>