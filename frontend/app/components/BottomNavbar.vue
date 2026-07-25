<script setup lang="ts">
import { ref } from "vue";

const activeTab = ref("home");

const tabs = [
  {
    id: "home",
    icon: "i-heroicons-home",
    iconActive: "i-heroicons-home-solid",
    label: "Home",
  },
  {
    id: "search",
    icon: "i-heroicons-magnifying-glass",
    iconActive: "i-heroicons-magnifying-glass-solid",
    label: "Search",
  },
  { id: "add", isPlus: true },
  {
    id: "history",
    icon: "i-heroicons-clock",
    iconActive: "i-heroicons-clock-solid",
    label: "History",
  },
  {
    id: "profile",
    icon: "i-heroicons-user",
    iconActive: "i-heroicons-user-solid",
    label: "Profile",
  },
];
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 flex items-center justify-center w-full p-4 z-50"
  >
    <nav
      class="relative w-full max-w-sm bg-white rounded-[24px] shadow-lg px-2 py-3 flex items-center justify-between"
    >
      <template v-for="tab in tabs" :key="tab.id">
        <!-- Bouton "+" central -->
        <span v-if="tab.isPlus" class="flex-1 flex justify-center">
          <button
            class="flex items-center justify-center w-12 h-12 bg-emerald-500 text-white rounded-full shadow-md transition-transform hover:bg-emerald-600 active:scale-95 focus:outline-none"
          >
            <UIcon name="i-heroicons-plus" class="w-6 h-6" />
          </button>
        </span>

        <!-- Autres onglets -->
        <button
          v-else
          class="flex-1 flex flex-col items-center gap-1 focus:outline-none transition-colors"
          :class="
            activeTab === tab.id
              ? 'text-emerald-500'
              : 'text-gray-400 hover:text-gray-500'
          "
          @click="activeTab = tab.id"
        >
          <UIcon
            :name="activeTab === tab.id ? tab.iconActive : tab.icon"
            class="w-5 h-5 transition-transform"
            :class="activeTab === tab.id ? 'scale-110' : ''"
          />
          <span class="text-[10px] font-medium">{{ tab.label }}</span>
        </button>
      </template>
    </nav>
  </div>
</template>
