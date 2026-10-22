<template>
  <span
    class="inline-flex items-center font-medium"
    :class="[
      'px-2 py-0.5 rounded-full text-xs',
      statusClass,
    ]"
  >
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  statut: StatutCommande | 'litige' | 'en_attente' | 'annule';
}>();

const statusConfig: Record<string, { label: string; color: string }> = {
  [StatutCommande.EN_ATTENTE]: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  [StatutCommande.PAYEE]: { label: 'Payée', color: 'bg-green-100 text-green-700' },
  [StatutCommande.EXPIREE]: { label: 'Expirée', color: 'bg-gray-100 text-gray-600' },
  [StatutCommande.EN_COURS_DE_PROD]: { label: 'En production', color: 'bg-blue-100 text-blue-700' },
  [StatutCommande.EXPIREEE]: { label: 'Expédiée', color: 'bg-cyan-100 text-cyan-700' },
  [StatutCommande.LIVREE]: { label: 'Livrée', color: 'bg-teal-100 text-teal-700' },
  [StatutCommande.LITIGE]: { label: 'Litige', color: 'bg-red-100 text-red-700' },
  [StatutCommande.ANNULEE]: { label: 'Annulée', color: 'bg-stone-200 text-stone-600' },
};

// Aliases
const key = (props.statut === 'en_attente' ? StatutCommande.EN_ATTENTE :
             props.statut === 'annule' ? StatutCommande.ANNULEE :
             props.statut) as string;

const statusClass = computed(() => statusConfig[key]?.color || 'bg-gray-100 text-gray-600');
const statusLabel = computed(() => statusConfig[key]?.label || props.statut);
</script>
