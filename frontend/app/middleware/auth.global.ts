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

  const authOnlyPages = ["/login", "/signup", "/auth/forgot-password", "/auth/verify-account"];
  const isResetPasswordRoute = to.path.startsWith("/auth/reset-password/");
  const isVerifyAccountRoute = to.path.startsWith("/auth/verify-account/");
  const isPublic = publicRoutes.includes(to.path) || isResetPasswordRoute || isVerifyAccountRoute;

  const { user, accessToken, initAuth } = useAuth();

  if (authOnlyPages.includes(to.path)) {
    if (accessToken.value && user.value) return navigateTo("/dashboard");
    try {
      const restored = await initAuth();
      if (restored && user.value) return navigateTo("/dashboard");
    } catch {
      // reste sur la page publique
    }
    return;
  }

  if (isPublic) return;

  if (accessToken.value && user.value) return;

  try {
    const restored = await initAuth();
    if (!restored || !user.value) {
      return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
    }
  } catch (e: any) {
    console.error("[middleware] initAuth failed:", e?.cause ?? e?.message ?? e);
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});