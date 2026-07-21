<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth"
});

const route = useRoute();
const loading = ref(false);

type Schema = {
  email: string;
  code: string;
  password: string;
  passwordConfirm: string;
};

async function onSubmit(data: Schema) {
  loading.value = true;
  try {
    await $fetch("/api/auth/reset-password", {
      method: "POST",
      body: {
        email: data.email,
        code: data.code,
        password: data.password
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
  <ResetPasswordForm :loading="loading" @submit="onSubmit" />
</template>