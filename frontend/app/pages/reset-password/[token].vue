<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block mb-4">
          <span class="text-2xl font-sora font-bold text-[#12403F]">Layerly</span>
        </NuxtLink>
        <h1 class="font-sora font-bold text-2xl md:text-3xl mb-2">Réinitialiser le mot de passe</h1>
        <p class="text-gray-600 text-sm">
          Entrez votre nouveau mot de passe ci-dessous.
        </p>
      </div>

      <!-- Form -->
      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- New password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder="••••••••"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12403F] focus:border-transparent pr-10"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabindex="-1"
              >
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
            <!-- Password requirements -->
            <div v-if="newPassword" class="mt-2 space-y-1">
              <div class="flex items-center gap-1.5 text-xs" :class="passwordStrength.length >= 4 ? 'text-green-600' : 'text-gray-400'">
                <svg v-if="passwordStrength.length >= 4" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                <span>8 caractères minimum</span>
              </div>
              <div class="flex items-center gap-1.5 text-xs" :class="passwordStrength.length >= 3 ? 'text-green-600' : 'text-gray-400'">
                <svg v-if="passwordStrength.length >= 3" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                <span>Chiffre + Lettre + Caractère spécial</span>
              </div>
            </div>
          </div>

          <!-- Confirm password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#12403F] focus:border-transparent pr-10"
            />
            <div v-if="confirmPassword" class="mt-1 text-xs" :class="newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'">
              {{ newPassword === confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas' }}
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading || newPassword !== confirmPassword || passwordStrength.length < 4"
            class="w-full py-2.5 bg-[#12403F] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'En cours...' : 'Réinitialiser' }}
          </button>
        </form>

        <!-- Success message -->
        <div v-if="success" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-800 text-sm text-center">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <NuxtLink
            to="/login"
            class="text-green-700 text-sm mt-2 hover:underline text-center w-full block"
          >
            Se connecter
          </NuxtLink>
        </div>

        <!-- Error message -->
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
import { useApiService } from '~/services/auth.service';

definePageMeta({
  middleware: ['guest'],
});

setTitle('Réinitialiser le mot de passe — Layerly');

const { resetPassword } = useApiService();
const route = useRoute();
const router = useRouter();

const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const loading = ref(false);
const success = ref(false);
const error = ref('');

// Password strength: 4 = min length, 3 = has number+letter+special
const passwordStrength = computed(() => {
  const pw = newPassword.value;
  if (!pw) return [];
  const strengths = [];
  if (pw.length >= 8) strengths.push('length');
  if (/[0-9]/.test(pw)) strengths.push('number');
  if (/[a-zA-Z]/.test(pw)) strengths.push('letter');
  if (/[^a-zA-Z0-9]/.test(pw)) strengths.push('special');
  return strengths;
});

async function handleSubmit() {
  error.value = '';
  success.value = false;

  const token = route.params.token as string;
  if (!token) {
    error.value = 'Lien invalide.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas.';
    return;
  }

  loading.value = true;

  try {
    await resetPassword(token, newPassword.value);
    success.value = true;
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Le lien est invalide ou expiré.';
  } finally {
    loading.value = false;
  }
}
</script>
