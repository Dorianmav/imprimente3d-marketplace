<script setup lang="ts">
const { user, accessToken, logout } = useAuth();
const config = useRuntimeConfig();
const toast = useToast();

if (!user.value) {
  await navigateTo("/login");
}

const deleteLoading = ref(false);

async function handleDeleteAccount(password: string) {
  deleteLoading.value = true;
  try {
    await $fetch(`${config.public.apiBase}/auth/delete-account`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: { password },
    });
    accessToken.value = null;
    user.value = null;
    await navigateTo("/login");
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e?.data?.message || "Mot de passe incorrect.",
      color: "error",
    });
  } finally {
    deleteLoading.value = false;
  }
}

async function handleLogout() {
  await logout();
  await navigateTo("/");
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-2xl border border-gray-400 bg-white p-8 shadow-sm">
      <ProfilCard
        v-if="user"
        :user="user"
        :delete-loading="deleteLoading"
        @delete-account="handleDeleteAccount"
        @logout="handleLogout"
      />
    </div>
  </div>
</template>