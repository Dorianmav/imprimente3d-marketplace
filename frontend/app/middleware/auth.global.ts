export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/forgot-password",
    "/auth/verify-account",
    "/auth/reset-password",
    "/about",
    "/contact",
    "/pricing",
    "/terms",
    "/privacy",
    "/faq",
    "/blog",
    "/careers",
    "/press",
    "/support",
    "/community",
    "/features",
    "/demo",
    "/testimonials",
    "/resources",
    "/events",
    "/webinars",
    "/case-studies",
    "/whitepapers",
    "/ebooks",
    "/guides",
    "/templates",
    "/checklists",
    "/calculators",
    "/quizzes",
    "/surveys",
  ];

  if (publicRoutes.includes(to.path)) return;

  const { accessToken, initAuth } = useAuth();

  if (accessToken.value) {
    return;
  }

  const restored = await initAuth();
  if (!restored) {
    return navigateTo('/login');
  }
});
