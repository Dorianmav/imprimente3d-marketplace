<template>
  <div class="relative">
    <div class="relative flex items-center">
      <!-- Search icon -->
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        ref="input"
        v-model="localQuery"
        type="text"
        :placeholder="placeholder"
        :class="[
          'w-full rounded-full pl-9 pr-10 py-2.5 text-sm',
          'bg-white border border-gray-200 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20',
          'placeholder-gray-400 text-gray-900 transition-all',
          pillClass,
        ]"
        :disabled="loading"
        @input="handleInput"
        @focus="handleFocus"
        @keydown.enter="handleSearch"
      />

      <!-- Loading spinner -->
      <div v-if="loading" class="absolute right-3">
        <svg class="w-4 h-4 animate-spin text-primary-container" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Clear button -->
      <button
        v-else-if="localQuery"
        class="absolute right-3 p-0.5 rounded-full hover:bg-gray-100"
        @click="handleClear"
      >
        <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Autocomplete dropdown -->
    <div
      v-if="showDropdown && suggestions.length > 0"
      class="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-64 overflow-y-auto"
    >
      <button
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
        @click="handleSelect(suggestion)"
      >
        <!-- Type icon -->
        <span :class="suggestion.type === 'VENTE' ? 'text-primary-container' : 'text-blue-500'">
          <svg v-if="suggestion.type === 'VENTE'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </span>
        <div>
          <div class="font-medium text-gray-900">{{ suggestion.text }}</div>
          <div class="text-xs text-gray-500">{{ suggestion.type }} · {{ suggestion.author }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSearchService } from '~/services/search.service';
import { onClickOutside } from '@vueuse/core';

const searchService = useSearchService();

const props = withDefaults(defineProps<{
  placeholder?: string;
  showTrending?: boolean;
}>(), {
  placeholder: 'Rechercher un modèle, un service...',
  showTrending: true,
});

const emit = defineEmits<{
  search: [query: string];
}>();

const localQuery = ref('');
const loading = ref(false);
const suggestions = ref<Array<{ id: string; text: string; type: string; author: string }>>([]);
const showDropdown = ref(false);
const input = ref<HTMLInputElement | null>(null);
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

let hasSelected = false;

function handleInput() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value);
  const query = localQuery.value.trim();

  if (!query) {
    suggestions.value = [];
    showDropdown.value = props.showTrending;
    return;
  }

  showDropdown.value = true;
  debounceTimer.value = setTimeout(() => fetchSuggestions(query), 250);
}

async function fetchSuggestions(query: string) {
  loading.value = true;
  try {
    const result = await searchService.autocomplete(query);
    suggestions.value = (result.items || []).map((item: any) => ({
      id: item.id,
      text: item.title || item.titre || item.content,
      type: item.type || '',
      author: item.author || '',
    }));
  } catch {
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

function handleFocus() {
  if (!localQuery.value && props.showTrending) {
    fetchTrending();
  }
  showDropdown.value = true;
}

async function fetchTrending() {
  try {
    const result = await searchService.getTrending();
    suggestions.value = (result.trending || []).slice(0, 5).map((t: string, i: number) => ({
      id: `trend-${i}`,
      text: t,
      type: 'Tendance',
      author: '',
    }));
  } catch {
    suggestions.value = [];
  }
}

function handleSearch() {
  const query = localQuery.value.trim();
  if (query) {
    hasSelected = true;
    showDropdown.value = false;
    emit('search', query);
    // Navigate to search results
    navigateTo(`/search?q=${encodeURIComponent(query)}`);
  }
}

function handleClear() {
  localQuery.value = '';
  suggestions.value = [];
  showDropdown.value = props.showTrending;
  input.value?.focus();
}

function handleSelect(suggestion: typeof suggestions.value[0]) {
  localQuery.value = suggestion.text;
  hasSelected = true;
  showDropdown.value = false;
  navigateTo(`/search?q=${encodeURIComponent(suggestion.text)}`);
}

// Close dropdown on outside click
onClickOutside(input, () => {
  if (!hasSelected) showDropdown.value = false;
});
</script>
