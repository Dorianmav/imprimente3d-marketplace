<script setup lang="ts">
import ProfilePersonalSection from './profil/ProfilePersonalSection.vue';
import ProfilContactSection from './profil/ProfilContactSection.vue';
import type { UserType } from '~/types/user.ts';

const { accessToken } = useAuth();
const config = useRuntimeConfig();
const toast = useToast();

const props = defineProps<{
  user: UserType;
  deleteLoading?: boolean;
}>();

const emit = defineEmits<{
  "delete-account": [password: string];
  logout: [];
}>();

const isDeleteModalOpen = ref(false);
const deletePassword = ref("");

function confirmDelete() {
  emit("delete-account", deletePassword.value);
}

const isEditingLoading = ref(false);
async function handleUpdateUser(diff: Partial<UserType> & { id: number }) {
  isEditingLoading.value = true;
  try {
    const updated = await $fetch<UserType>(`${config.public.apiBase}/user/${diff.id}`, {
      method: "PATCH", // PATCH est plus sémantique qu'un PUT pour une maj partielle
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: diff, // <-- uniquement les champs modifiés
    });

    // on répercute la réponse du back sur l'objet user affiché
    Object.assign(props.user, updated ?? diff);

    toast.add({ title: "Profil mis à jour", color: "success" });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    toast.add({
      title: "Erreur",
      description: error?.data?.message || "Impossible de sauvegarder.",
      color: "error",
    });
  } finally {
    isEditingLoading.value = false;
  }
}

</script>

<template>
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-bold mb-2">Dashboard</h1>
    <UButton icon="i-tabler-trash" class="text-red-500 hover:text-red-600" variant="ghost" color="error"
      aria-label="Supprimer le compte" @click="isDeleteModalOpen = true" />

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
            <UInput v-model="deletePassword" type="password" size="lg" class="w-full" />
          </UFormField>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="isDeleteModalOpen = false">
                Annuler
              </UButton>
              <UButton color="error" :loading="deleteLoading" @click="confirmDelete">
                Supprimer définitivement
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>

  <p class="mb-6 text-gray-600">Profil chargé depuis `GET /auth/me`.</p>

  <div class="flex items-center">
    <UAvatar :src="user.avatar" class="ml-2" />
    <span class="font-semibold">Avatar</span>
  </div>

  <ProfilePersonalSection :user="user" :loading="isEditingLoading" @update:user="handleUpdateUser" />

  <ProfilContactSection :user="user" :loading="isEditingLoading" @update:user="handleUpdateUser" />

  <div class="space-y-2 text-sm">

    <div class="flex items-center">
      <p><span class="font-semibold">Email :</span> {{ user.email }}</p>
    </div>

    <div class="flex items-center">
      <span class="font-semibold">Adresse de facturation :</span>
      <pre class="ml-2">{{ user.addressFacturation }}</pre>
    </div>

    <p><span class="font-semibold">Compte :</span> {{ user.typeCompte }}</p>

    <UButton class="mt-4 w-full" color="error" @click="emit('logout')">
      Se déconnecter
    </UButton>
  </div>
</template>
