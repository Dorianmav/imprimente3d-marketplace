export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware for app.vue root
  if (to.name === 'app') return;

  // Public routes (no auth required)
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/reset-password/[token]",
    "/verify-email",
    "/verify-email/[token]",
    "/search",
  ];

  // Check if route matches any public route pattern
  const isPublic = publicRoutes.some(route => {
    if (route === to.path) return true;
    // Handle dynamic segments
    const routeParts = route.split('/');
    const pathParts = to.path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, i) => part === pathParts[i] || part.startsWith('['));
  });

  if (isPublic) return;

  // Allow /profile/me (authenticated users only)
  if (to.path.startsWith('/profile/me')) {
    const { accessToken, initAuth, profile } = useAuth();
    const restored = accessToken.value ? true : await initAuth();
    if (!restored) return navigateTo('/login');
    // Redirect to actual user ID
    if (profile.value?.id) {
      return navigateTo(`/profile/${profile.value.id}`, { redirectResolved: true });
    }
    return;
  }

  const { accessToken, initAuth } = useAuth();

  if (accessToken.value) {
    return;
  }

  const restored = await initAuth();
  if (!restored) {
    return navigateTo('/login');
  }
});
