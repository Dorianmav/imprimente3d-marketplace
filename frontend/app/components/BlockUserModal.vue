<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center px-4" @click.self="$emit('update:modelValue', false)">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/40" />

      <!-- Modal -->
      <div class="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 class="font-sora font-bold text-lg mb-2">
          {{ isBlocked ? 'Débloquer' : 'Bloquer' }} {{ userName }}
        </h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ isBlocked
            ? 'Êtes-vous sûr de vouloir débloquer cet utilisateur ?'
            : 'Êtes-vous sûr de vouloir bloquer cet utilisateur ? Vous ne pourrez plus lui envoyer de messages.'
          }}
        </p>

        <div v-if="!isBlocked" class="mb-4">
          <label class="block text-sm font-medium mb-1">Raison (optionnelle)</label>
          <textarea
            v-model="reason"
            rows="2"
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Pourquoi vous voulez bloquer cet utilisateur..."
          />
        </div>

        <div class="flex gap-2 justify-end">
          <button
            @click="$emit('update:modelValue', false)"
            class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            @click="handleConfirm"
            class="px-4 py-2 text-sm rounded-lg transition-colors"
            :class="isBlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-600 text-white hover:bg-red-700'"
          >
            {{ isBlocked ? 'Débloquer' : 'Bloquer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  userName: string;
  isBlocked: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [payload: { userId: string; reason: string }];
  cancel: [];
}>();

const reason = ref('');

function handleConfirm() {
  // userId will be set by parent via emit
  emit('confirm', { userId: '', reason: reason.value });
  reason.value = '';
}

function watchModalOpen(val: boolean) {
  if (!val) reason.value = '';
}

watch(() => props.modelValue, watchModalOpen);
</script>
