<script setup lang="ts">
interface BalanceEntry {
  amount: number;
  currency: string;
}

const props = defineProps<{
  available: BalanceEntry[];
  pending: BalanceEntry[];
}>();

function formatMontant(entry: BalanceEntry | undefined): string {
  if (!entry) return "0,00 €";
  return (entry.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: entry.currency.toUpperCase(),
  });
}

const totalDisponible = computed(() => props.available[0]);
const totalEnAttente = computed(() => props.pending[0]);
</script>

<template>
  <div
    class="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 sm:flex-row sm:gap-8"
  >
    <div class="flex flex-col gap-1">
      <span class="text-sm text-neutral-500">Disponible</span>
      <span class="text-2xl font-semibold text-neutral-900">
        {{ formatMontant(totalDisponible) }}
      </span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-sm text-neutral-500">En attente</span>
      <span class="text-xl font-medium text-neutral-500">
        {{ formatMontant(totalEnAttente) }}
      </span>
    </div>
  </div>
</template>
