<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineProps<{ loading?: boolean }>();

const schema = z.object({
  code: z
    .string("Code requis")
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code doit contenir uniquement des chiffres"),
});

type Schema = z.output<typeof schema>;

const codeDigits = ref<string[]>([]);
const state = reactive<Partial<Schema>>({
  code: "",
});

watch(codeDigits, (val) => {
  state.code = val.join("");
});

const emit = defineEmits<{ submit: [data: Schema] }>();

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("submit", event.data);
}

function resendCode() {
  emit("submit", { code: "" });
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
        Vérification
      </p>
      <h2 class="text-2xl font-bold tracking-tight mt-1">Vérifier le compte</h2>
      <p class="text-sm text-muted mt-1.5">
        Entrez le code à 6 chiffres reçu par email.
      </p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
      <UFormField label="Code de vérification" name="code" class="flex flex-col items-center">
        <UPinInput v-model="codeDigits" :length="6" type="number" size="xl" class="justify-center" />
      </UFormField>

      <UButton type="submit" :loading="loading" size="lg" block class="font-medium">
        Vérifier
      </UButton>

      <p class="text-center text-sm text-muted">
        Rien reçu ?
        <button v-on:click="resendCode()" class="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Renvoyer le code
        </button>
      </p>
    </UForm>
  </UCard>
</template>