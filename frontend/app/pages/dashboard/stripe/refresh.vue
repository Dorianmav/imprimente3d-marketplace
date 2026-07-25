<script setup lang="ts">
const { accessToken } = useAuth();
const config = useRuntimeConfig();

onMounted(async () => {
  try {
    const { url } = await $fetch<{ url: string }>(
      `${config.public.apiBase}/stripe/onboarding-link`,
      {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken.value}` },
      },
    );
    window.location.href = url;
  } catch {
    await navigateTo("/dashboard");
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-gray-600">Redirection en cours...</p>
  </div>
</template>