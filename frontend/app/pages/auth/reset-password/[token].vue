<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

const token = route.params.token as string;

const loading = ref(false);
const error = ref("");
const success = ref(false);

async function onSubmit(data: { password: string; passwordConfirm: string }) {
  error.value = "";
  loading.value = true;
  try {
    await $fetch(`${config.public.apiBase}/auth/reset-password`, {
      method: "POST",
      body: { token, newPassword: data.password },
    });
    success.value = true;
    setTimeout(() => router.push("/login"), 2000);
  } catch (e: any) {
    error.value = e?.data?.message || "Lien invalide ou expiré.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ResetPasswordForm
    :loading="loading"
    :error="error"
    :success="success"
    @submit="onSubmit"
  />
</template>