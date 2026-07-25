<script setup lang="ts">
const emit = defineEmits<{
  connect: [];
}>();

defineProps<{
  loading: boolean;
}>();
</script>

<template>
  <div
    class="flex max-w-md flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8"
  >
    <h2 class="m-0 text-lg font-semibold text-neutral-900">
      Aucun compte de paiement relié
    </h2>
    <p class="m-0 leading-relaxed text-neutral-500">
      Pour recevoir vos paiements et suivre votre solde, connectez un compte
      Stripe. L'opération prend quelques minutes.
    </p>
    <button
      :disabled="loading"
      class="rounded-lg bg-neutral-900 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
      @click="emit('connect')"
    >
      {{ loading ? "Redirection..." : "Connecter un compte Stripe" }}
    </button>
  </div>
</template>
