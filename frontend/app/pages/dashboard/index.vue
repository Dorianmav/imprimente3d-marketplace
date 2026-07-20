<script setup lang="ts">
const { user, fetchProfile, logout } = useAuth();

if (!user.value) {
    await fetchProfile();
}

async function handleLogout() {
    await logout();
    await navigateTo('/pages');
}

</script>

<template>
    <div class="flex min-h-screen items-center justify-center">
        <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 class="text-2xl font-bold mb-2">Dashboard</h1>
            <p class="mb-6 text-gray-600">Profil chargé depuis `GET /auth/me`.</p>

            <div v-if="user" class="space-y-2 text-sm">
                <!-- <UAvatar :name="user.prenom + ' ' + user.nom" :src="user.avatar" size="xl" /> -->
                <p><span class="font-semibold">ID :</span> {{ user.id }}</p>
                <p><span class="font-semibold">Email :</span> {{ user.email }}</p>
                <p><span class="font-semibold">Nom :</span> {{ user.prenom }} {{ user.nom }}</p>
                <p><span class="font-semibold">Compte :</span> {{ user.typeCompte }}</p>
                <UButton class="mt-4 w-full" color="primary" @click="handleLogout">Se déconnecter</UButton>
            </div>
        </div>
    </div>
</template>