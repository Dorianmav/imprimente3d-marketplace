<script setup lang="ts">
definePageMeta({
  layout: "auth"
});

const loading = ref(false);

type Schema = {
  email: string;
};

async function onSubmit(data: Schema) {
  loading.value = true;
  try {
    await $fetch("/api/auth/forgot-password", {
      method: "POST",
      body: {
        email: data.email
      }
    });
    await navigateTo("/auth/verify-account");
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ForgotPasswordForm :loading="loading" @submit="onSubmit" />
</template>