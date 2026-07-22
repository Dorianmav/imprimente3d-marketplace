<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

const token = route.params.token as string;

const loading = ref(true);
const error = ref("");

async function verify() {
  loading.value = true;
  error.value = "";
  try {
    await $fetch(`${config.public.apiBase}/auth/verify-account`, {
      method: "POST",
      credentials: "include",
      body: { token },
    });
    router.push("/dashboard");
  } catch (e: any) {
    error.value = e?.data?.message || "Lien invalide ou expiré.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  verify();
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 py-8"
    style="
      padding-top: max(2rem, env(safe-area-inset-top));
      padding-bottom: max(2rem, env(safe-area-inset-bottom));
    "
  >
    <UCard
      :ui="{
        root: 'w-full max-w-md mx-auto rounded-2xl shadow-xl ring ring-default border-l-4 border-emerald-500 overflow-hidden',
      }"
    >
      <template #header>
        <p
          class="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
        >
          Vérification
        </p>
        <h2 class="text-2xl font-bold tracking-tight mt-1">
          Vérification du compte
        </h2>
      </template>

      <div class="text-center py-4">
        <p v-if="loading" class="text-sm text-muted">
          Vérification en cours...
        </p>
        <template v-else-if="error">
          <p class="text-sm text-red-500 mb-4">{{ error }}</p>
          <ULink
            to="/auth/forgot-verification"
            class="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Renvoyer un lien
          </ULink>
        </template>
      </div>
    </UCard>
  </div>
</template>
