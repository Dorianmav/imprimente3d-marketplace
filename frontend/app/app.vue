<template>
  <UApp :class="layoutClass">
    <TopNav />
    <div class="flex-1">
      <NuxtPage />
    </div>
    <BottomNav />
  </UApp>
</template>

<script setup lang="ts">
const layoutClass = computed(() => {
  // Flex column layout with min-height, top nav offset
  return 'flex flex-col min-h-screen md:pt-14';
});
</script>
