<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block mb-4">
          <span class="text-2xl font-sora font-bold text-[#12403F]">Layerly</span>
        </NuxtLink>
        <h1 class="font-sora font-bold text-2xl md:text-3xl mb-2">Mot de passe oublié ?</h1>
        <p class="text-gray-600 text-sm">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      <!-- Form -->
      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="votre@email.com"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12403F] focus:border-transparent"
            />
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Envoi en cours...' : 'Envoyer le lien' }}
          </button>
        </form>

        <!-- Success message -->
        <div v-if="success" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-800 text-sm text-center">
            Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.
          </p>
          <button
            @click="resetForm"
            class="text-green-700 text-sm mt-2 hover:underline text-center w-full block"
          >
            Réessayer avec un autre email
          </button>
        </div>

        <!-- Error message -->
        <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-800 text-sm text-center">{{ error }}</p>
        </div>
      </div>

      <!-- Footer links -->
      <div class="mt-6 text-center space-y-2">
        <NuxtLink to="/login" class="text-sm text-[#12403F] hover:underline block">
          ← Retour à la connexion
        </NuxtLink>
        <p class="text-sm text-gray-600">
          Vous vous en souvenez ? <NuxtLink to="/login" class="text-[#12403F] hover:underline">Se connecter</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApiService } from '~/services/auth.service';

definePageMeta({
  middleware: ['guest'],
});

setTitle('Mot de passe oublié — Layerly');

const { forgotPassword } = useApiService();
const email = ref('');
const loading = ref(false);
const success = ref(false);
const error = ref('');

async function handleSubmit() {
  error.value = '';
  success.value = false;
  loading.value = true;

  try {
    await forgotPassword(email.value);
    success.value = true;
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Une erreur est survenue.';
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  success.value = false;
  error.value = '';
  email.value = '';
}
</script>
