<script setup lang="ts">
definePageMeta({
  layout: "auth"
});

const loading = ref(false);

type Schema = {
  code: string;
};

async function onSubmit(data: Schema) {
  loading.value = true;
  try {
    await $fetch("/api/auth/verify-account", {
      method: "POST",
      body: {
        code: data.code
      }
    });
    await navigateTo("/auth/login");
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <VerifyAccountForm :loading="loading" @submit="onSubmit" />
</template>