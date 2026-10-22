<template>
  <NuxtLink :to="`/ventes/${vente.id}`" class="group">
    <div class="card overflow-hidden transition-all duration-200 hover:scale-[1.01]">
      <!-- Image -->
      <div class="relative aspect-square bg-gray-200 overflow-hidden">
        <img
          v-if="vente.photos?.[0]"
          :src="vente.photos[0]"
          :alt="vente.titre"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <!-- Material badge -->
        <div class="absolute top-2 right-2">
          <MaterialBadge :materiau="vente.materiau" size="sm" />
        </div>

        <!-- Favorite button -->
        <button
          class="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          @click.stop
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-3">
        <h3 class="font-sora font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary-container transition-colors">
          {{ vente.titre }}
        </h3>
        <p class="text-xs text-gray-500 line-clamp-2 mb-2">{{ vente.description }}</p>

        <!-- Price -->
        <div class="flex items-center justify-between">
          <span class="font-sora font-bold text-primary-container">
            {{ formatPrice(vente.prixProduit) }}
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  vente: Omit<AnnonceVente, 'vendeur'> & Partial<Pick<AnnonceVente, 'vendeur'>>;
}>();

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
</script>
