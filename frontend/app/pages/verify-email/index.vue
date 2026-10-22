<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md text-center">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/" class="inline-block mb-4">
          <span class="text-2xl font-sora font-bold text-[#12403F]">Layerly</span>
        </NuxtLink>
        <h1 class="font-sora font-bold text-2xl md:text-3xl mb-2">Vérification de l'email</h1>
      </div>

      <!-- Card -->
      <div class="card p-6">
        <!-- Verifying state -->
        <div v-if="state === 'verifying'">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center">
              <svg class="w-8 h-8 text-primary-container animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
          <h2 class="font-medium text-lg mb-1">Vérification en cours...</h2>
          <p class="text-gray-600 text-sm">
            Nous vérifions votre lien de vérification.
          </p>
        </div>

        <!-- Success state -->
        <div v-else-if="state === 'success'">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 class="font-medium text-lg mb-1">Email vérifié !</h2>
          <p class="text-gray-600 text-sm mb-4">
            Votre adresse email a été vérifiée avec succès.
          </p>
          <NuxtLink
            to="/dashboard"
            class="block py-2.5 bg-[#12403F] text-white font-medium rounded-lg hover:bg-[#0d302f] transition-colors"
          >
            Aller au tableau de bord
          </NuxtLink>
        </div>

        <!-- Error state -->
        <div v-else-if="state === 'error'">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 class="font-medium text-lg mb-1">Lien invalide</h2>
          <p class="text-gray-600 text-sm mb-4">
            Ce lien de vérification est invalide ou a expiré.
          </p>
          <button
            @click="resendVerification"
            :disabled="resendLoading"
            class="w-full py-2.5 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {{ resendLoading ? 'Envoi...' : 'Renvoyer l\'email' }}
          </button>
        </div>

        <!-- Error state: already verified -->
        <div v-else-if="state === 'already'">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 class="font-medium text-lg mb-1">Email déjà vérifié</h2>
          <p class="text-gray-600 text-sm mb-4">
            Votre email est déjà vérifié.
          </p>
          <NuxtLink
            to="/dashboard"
            class="block py-2.5 bg-[#12403F] text-white font-medium rounded-lg hover:bg-[#0d302f] transition-colors"
          >
            Aller au tableau de bord
          </NuxtLink>
        </div>

        <!-- Error detail -->
        <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-800 text-sm text-center">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <NuxtLink to="/login" class="text-sm text-[#12403F] hover:underline">
          ← Retour à la connexion
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const state = ref<'verifying' | 'success' | 'error' | 'already'>('verifying');
const error = ref('');
const resendLoading = ref(false);

async function verifyEmail(token: string) {
  try {
    const res = await $fetch<{ message: string }>(`${apiBase}/auth/verify-email`, {
      method: 'POST',
      body: { token },
    });
    state.value = 'success';
  } catch (err: any) {
    if (err?.data?.message?.includes?.('déjà')) {
      state.value = 'already';
    } else {
      state.value = 'error';
      error.value = err?.data?.message || 'Le lien est invalide ou expiré.';
    }
  }
}

async function resendVerification() {
  // Get email from query param if available
  const email = route.query.email as string;
  resendLoading.value = true;
  error.value = '';

  try {
    await $fetch(`${apiBase}/auth/resend-verification`, {
      method: 'POST',
      body: { email },
    });
    error.value = 'Un nouvel email de vérification a été envoyé.';
    // Brief delay then go back to verifying
    setTimeout(() => {
      state.value = 'verifying';
      error.value = '';
    }, 2000);
  } catch (err: any) {
    error.value = err?.data?.message || 'Erreur lors de l\'envoi.';
  } finally {
    resendLoading.value = false;
  }
}

// Auto-verify from route query
onMounted(async () => {
  const token = route.query.token as string;
  if (token) {
    await verifyEmail(token);
  } else {
    state.value = 'error';
    error.value = 'Aucun token de vérification fourni.';
  }
});
</script>
