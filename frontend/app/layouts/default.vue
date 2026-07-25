<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <main class="flex-1 overflow-y-auto pb-16">
      <slot />
    </main>

    <BottomNavbar />
  </div>
</template>
