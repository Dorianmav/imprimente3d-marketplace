export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const { accessToken, refresh, logout } = useAuth();

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      if (accessToken.value) {
        options.headers.set('Authorization', `Bearer ${accessToken.value}`);
      }
    },
    async onResponseError({ response, request, options }) {
      if (response.status === 401) {
        try {
          await refresh();
          options.headers.set('Authorization', `Bearer ${accessToken.value}`);
          return $fetch(request, options);
        } catch {
          await logout();
        }
      }
    },
  });

  return {
    provide: { api },
  };
});