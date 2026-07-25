<script setup lang="ts">
const props = defineProps<{
  loading: boolean;
  disponible: number;
}>();

const emit = defineEmits<{
  submit: [amount: number];
}>();

const montant = ref<string>("");
const validationError = ref<string | null>(null);

function handleSubmit() {
  validationError.value = null;
  const value = Number(montant.value.replace(",", "."));

  if (!value || value <= 0) {
    validationError.value = "Indiquez un montant supérieur à 0.";
    return;
  }

  const centimes = Math.round(value * 100);
  if (centimes > props.disponible) {
    validationError.value = "Ce montant dépasse votre solde disponible.";
    return;
  }

  emit("submit", centimes);
}
</script>

<template>
  <form class="flex max-w-xs flex-col gap-2" @submit.prevent="handleSubmit">
    <label for="montant-retrait" class="text-sm text-neutral-500">
      Montant à retirer
    </label>
    <div class="flex gap-2">
      <input
        id="montant-retrait"
        v-model="montant"
        type="text"
        inputmode="decimal"
        placeholder="0,00"
        :disabled="loading"
        class="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 disabled:bg-neutral-100"
      />
      <button
        type="submit"
        :disabled="loading"
        class="rounded-lg bg-neutral-900 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {{ loading ? "Envoi..." : "Retirer" }}
      </button>
    </div>
    <p v-if="validationError" class="m-0 text-sm text-red-700">
      {{ validationError }}
    </p>
  </form>
</template>
