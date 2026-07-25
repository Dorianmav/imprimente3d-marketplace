<script setup lang="ts">
const { user, fetchProfile } = useAuth();

const loading = ref(true);

onMounted(async () => {
  // laisse une seconde au webhook pour arriver avant de vérifier
  await new Promise((r) => setTimeout(r, 1500));
  try {
    await fetchProfile();
  } catch {
    // ignore, on affiche l'état actuel connu
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-2xl border border-gray-400 bg-white p-8 shadow-sm text-center">
      <template v-if="loading">
        <p class="text-gray-600">Vérification de votre compte Stripe...</p>
      </template>
      <template v-else-if="user?.stripeOnboardingComplete">
        <h2 class="text-xl font-bold mb-2">Compte activé</h2>
        <p class="text-gray-600 mb-4">Vous pouvez maintenant vendre sur la plateforme.</p>
        <NuxtLink to="/dashboard" class="text-primary underline">Retour au dashboard</NuxtLink>
      </template>
      <template v-else>
        <h2 class="text-xl font-bold mb-2">Configuration incomplète</h2>
        <p class="text-gray-600 mb-4">
          Certaines informations sont manquantes. Vous pouvez reprendre la configuration.
        </p>
        <NuxtLink to="/dashboard" class="text-primary underline">Retour au dashboard</NuxtLink>
      </template>
    </div>
  </div>
</template>