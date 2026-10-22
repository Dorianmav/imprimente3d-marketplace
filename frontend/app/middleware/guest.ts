export default defineNuxtRouteMiddleware(async (to) => {
  const { profile, accessToken, initAuth } = useAuth();

  // Restore session if needed
  if (!accessToken.value) {
    const restored = await initAuth();
    if (!restored) return; // Let auth.global handle redirect
  }

  // If already logged in, redirect to dashboard
  if (profile.value) {
    return navigateTo('/dashboard');
  }
});
