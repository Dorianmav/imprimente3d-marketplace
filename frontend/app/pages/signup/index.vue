<script setup lang="ts">
const toast = useToast();
const loading = ref(false);
const { signup, user } = useAuth();

async function handleSignUp(data: { prenom: string; nom: string; email: string; password: string; typeCompte: string }) {
  loading.value = true;
  try {
    const res = await signup(data.prenom, data.nom, data.email, data.password, data.typeCompte);
    user.value = res.user;
    //TODO: revoir les toasts pour qu'ils soient plus explicites et utiles pour l'utilisateur
    toast.add({ title: 'Success', description: 'Compte créé avec succès, vérifiez votre email', color: 'success' });
    await navigateTo('/login');
  } catch (err) {
    toast.add({ title: 'Error', description: 'Échec de la création du compte', color: 'error' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold mb-6">Sign Up</h1>
      <SignUpForm :loading="loading" @submit="handleSignUp" />
    </div>
  </div>
</template>