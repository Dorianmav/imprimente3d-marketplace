<script setup lang="ts">
const { user, accessToken, logout } = useAuth();
const config = useRuntimeConfig();
const toast = useToast();

if (!user.value) {
  await navigateTo("/login");
}

const isDeleteModalOpen = ref(false);
const deletePassword = ref("");
const deleteLoading = ref(false);

async function handleDeleteAccount() {
  deleteLoading.value = true;
  try {
    await $fetch(`${config.public.apiBase}/auth/delete-account`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: { password: deletePassword.value },
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
    <div
      class="w-full max-w-md rounded-2xl border border-gray-400 bg-white p-8 shadow-sm"
    >
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold mb-2">Dashboard</h1>
        <UButton
          icon="i-tabler-trash"
          class="text-red-500 hover:text-red-600"
          variant="ghost"
          aria-label="Supprimer le compte"
          @click="isDeleteModalOpen = true"
        />

        <UModal v-model:open="isDeleteModalOpen">
          <template #content>
            <UCard>
              <template #header>
                <h3 class="font-semibold text-lg">Supprimer le compte</h3>
              </template>

              <p class="text-sm text-muted mb-4">
                Cette action est irréversible. Vos données personnelles seront
                anonymisées, votre historique de transactions conservé pour
                obligations légales.
              </p>

              <UFormField label="Confirmez votre mot de passe">
                <UInput
                  v-model="deletePassword"
                  type="password"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <template #footer>
                <div class="flex justify-end gap-2">
                  <UButton variant="ghost" @click="isDeleteModalOpen = false"
                    >Annuler</UButton
                  >
                  <UButton
                    color="red"
                    :loading="deleteLoading"
                    @click="handleDeleteAccount"
                  >
                    Supprimer définitivement
                  </UButton>
                </div>
              </template>
            </UCard>
          </template>
        </UModal>
      </div>
      <p class="mb-6 text-gray-600">Profil chargé depuis `GET /auth/me`.</p>

      <div v-if="user" class="space-y-2 text-sm">
        <p><span class="font-semibold">ID :</span> {{ user.id }}</p>
        <p><span class="font-semibold">Email :</span> {{ user.email }}</p>
        <p>
          <span class="font-semibold">Nom :</span> {{ user.prenom }}
          {{ user.nom }}
        </p>
        <p><span class="font-semibold">Compte :</span> {{ user.typeCompte }}</p>
        <UButton class="mt-4 w-full" color="primary" @click="handleLogout"
          >Se déconnecter</UButton
        >
      </div>
    </div>
  </div>
</template>