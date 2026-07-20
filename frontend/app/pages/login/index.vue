<script setup lang="ts">
const toast = useToast();
const loading = ref(false);
const { login, user } = useAuth();

async function handleLogin(data: { email: string; password: string }) {
  loading.value = true;
  try {
    const res = await login(data.email, data.password);
    user.value = res.user;
    //TODO: revoir les toasts pour qu'ils soient plus explicites et utiles pour l'utilisateur
    toast.add({ title: 'Success', description: 'Logged in successfully', color: 'success' });
    await navigateTo('/dashboard');
  } catch (err) {
    toast.add({ title: 'Error', description: 'Invalid credentials', color: 'error' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold mb-6">Login</h1>
      <LoginForm :loading="loading" @submit="handleLogin" />
    </div>
  </div>
</template>