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
  email:  "",
  password: ""
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormField>

    <UFormField label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormField>

    <UButton type="submit" :loading="loading"> Se connecter </UButton>
  </UForm>
</template>