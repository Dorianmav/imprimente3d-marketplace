<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block">
          <span class="font-sora font-bold text-3xl text-primary-container">Layerly</span>
        </NuxtLink>
        <p class="text-sm text-gray-500 mt-2">Rejoignez la communauté</p>
      </div>

      <!-- Form -->
      <div class="card p-6">
        <SignUpForm @submit="handleSignup" :loading="loading" />
      </div>

      <!-- Footer -->
      <p class="text-center text-sm text-gray-500 mt-6">
        Déjà un compte ?
        <NuxtLink to="/login" class="text-primary-container font-medium hover:underline">
          Se connecter
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const authService = useApiService();

const loading = ref(false);

useHead({ title: 'Inscription — Layerly' });

async function handleSignup(data: { prenom: string; nom: string; email: string; password: string; typeCompte: string }) {
  loading.value = true;
  try {
    await authService.signup({
      email: data.email,
      password: data.password,
      prenom: data.prenom,
      nom: data.nom,
      typeCompte: data.typeCompte as any,
    });
    // Auto-login after signup
    navigateTo('/dashboard');
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Erreur d\'inscription', 'error');
  } finally {
    loading.value = false;
  }
}
</script>
