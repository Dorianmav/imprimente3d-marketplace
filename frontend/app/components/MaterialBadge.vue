<template>
  <span
    class="inline-flex items-center font-medium"
    :class="[
      'px-2 py-0.5 rounded-full text-xs',
      size === 'sm' ? 'text-[10px]' : 'text-xs',
      materialClass,
    ]"
  >
    {{ materialLabel }}
    <slot />
  </span>
</template>

<script setup lang="ts">
import { Materiau, type MateriauType } from '~/types';

const props = defineProps<{
  materiau: MateriauType;
  size?: 'sm' | 'md';
}>();

const materialConfig: Record<Materiau, { label: string; color: string }> = {
  [Materiau.PLA]: { label: 'PLA', color: 'bg-emerald-100 text-emerald-700' },
  [Materiau.PETG]: { label: 'PETG', color: 'bg-blue-100 text-blue-700' },
  [Materiau.ABS]: { label: 'ABS', color: 'bg-amber-100 text-amber-700' },
  [Materiau.ASA]: { label: 'ASA', color: 'bg-orange-100 text-orange-700' },
  [Materiau.TPU]: { label: 'TPU', color: 'bg-purple-100 text-purple-700' },
  [Materiau.RESINE]: { label: 'Résine', color: 'bg-pink-100 text-pink-700' },
};

const materialClass = computed(() => materialConfig[props.materiau]?.color || 'bg-gray-100 text-gray-700');
const materialLabel = computed(() => materialConfig[props.materiau]?.label || props.materiau);
</script>
