export default defineNuxtRouteMiddleware(async (to) => {
  const { profile, accessToken, initAuth } = useAuth();

  // Restore session if needed
  if (!accessToken.value) {
    const restored = await initAuth();
    if (!restored) return navigateTo('/login');
  }

  // Check if user is admin
  if (!profile.value?.role || profile.value.role !== 'ADMIN') {
    return navigateTo('/dashboard');
  }
});
